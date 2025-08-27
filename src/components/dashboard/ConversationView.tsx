import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeEmailHTML, extractTextFromHTML, shouldRenderAsHTML, fixEncodingIssues, formatEmailText, stripQuotedEmailHTML, stripQuotedEmailText, type EmailAttachment } from '@/utils/emailFormatting';
import { convertShortcodesToEmojis } from '@/utils/emojiUtils';
import { EmailRender } from '@/components/ui/email-render';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  MessageSquare, 
  Send,
  RefreshCw,
  Smile,
  Paperclip,
  Edit3,
  Trash2,
  Save,
  X,
  Loader2,
  ArrowLeft,
  Reply
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-responsive';

interface ConversationViewProps {
  conversationId: string | null;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ conversationId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { dateTime } = useDateFormatting();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // State management
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [showReplyArea, setShowReplyArea] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Fetch conversation
  const { data: conversation, isLoading: conversationLoading, error: conversationError } = useQuery({
    queryKey: ['conversation', conversationId, user?.id],
    queryFn: async () => {
      if (!conversationId) return null;
      const { data, error } = await supabase
        .from('conversations')
        .select('*, customer:customers(*)')
        .eq('id', conversationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId && !!user,
  });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId, user?.id],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId && !!user,
  });

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async ({ content, isInternal }: { content: string; isInternal: boolean }) => {
      if (!conversationId) throw new Error('No conversation ID');

      // Create message in database
      const { data: message, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content,
          sender_type: 'agent',
          is_internal: isInternal,
          content_type: 'text/plain'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send email if not internal
      if (!isInternal) {
        const { error: emailError } = await supabase.functions.invoke('send-reply-email', {
          body: { messageId: message.id }
        });
        
        if (emailError) {
          console.warn('Email sending failed:', emailError);
          toast.warning('Reply saved but email sending failed');
        }
      }

      return message;
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(isInternalNote ? 'Internal note added' : 'Reply sent successfully');
    },
    onError: (error) => {
      toast.error('Failed to send reply: ' + error.message);
    },
  });

  // Event handlers
  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    
    setSendLoading(true);
    try {
      await sendReplyMutation.mutateAsync({ 
        content: replyText, 
        isInternal: isInternalNote 
      });
    } finally {
      setSendLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendReply();
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">{t('conversation.selectConversation')}</p>
          <p className="text-sm">{t('conversation.chooseFromList')}</p>
        </div>
      </div>
    );
  }

  if (conversationLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversationError || !conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg mb-2">Error loading conversation</p>
          <p className="text-sm">{conversationError?.message || 'Conversation not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col bg-background">
      {/* Conversation Header */}
      <div className="flex-shrink-0 p-3 md:p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-1">
            {/* Back to Inbox Button */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('c');
                setSearchParams(newParams);
              }}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {isMobile ? '' : 'Back to Inbox'}
            </Button>
            
            {/* Customer Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {(conversation.customer?.full_name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="text-sm md:text-base font-semibold truncate">
                    {conversation.customer?.full_name || 'Unknown Customer'}
                  </h1>
                  <p className="text-xs text-muted-foreground truncate">
                    {conversation.customer?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 w-full flex bg-background">
        <div className="flex flex-col flex-1 min-h-0 w-full">
          <ScrollArea className="flex-1 pane">
            <div 
              ref={messagesContainerRef}
              className="p-3 md:p-6"
            >
              <div className="space-y-4 w-full">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t('conversation.noMessages')}</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isFromCustomer = message.sender_type === 'customer';
                    
                    return (
                      <Card key={message.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                               <Avatar className="h-8 w-8">
                                 <AvatarFallback className={isFromCustomer ? "bg-primary text-primary-foreground" : "bg-muted"}>
                                   {message.sender_id?.[0] || (isFromCustomer ? 'C' : 'A')}
                                 </AvatarFallback>
                               </Avatar>
                               <div>
                                <div className="font-medium text-sm">
                                  {isFromCustomer ? conversation.customer?.full_name || t('conversation.customer') : message.sender_id || t('conversation.agent')}
                                </div>
                                 <div className="text-xs text-muted-foreground">
                                   {message.created_at ? dateTime(message.created_at) : t('conversation.unknownTime')}
                                 </div>
                               </div>
                             </div>
                             {message.is_internal && (
                              <Badge variant="outline" className="text-xs">
                                {t('conversation.internalNote')}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <EmailRender
                            content={message.content}
                            contentType={message.content_type || 'text/plain'}
                            attachments={((message.attachments as unknown) as EmailAttachment[]) || []}
                            messageId={message.id}
                          />
                        </CardContent>
                      </Card>
                    );
                  })
                )}

              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
        
    </div>
  );
};