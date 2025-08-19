import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAutoContrast } from '@/hooks/useAutoContrast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeEmailHTML, extractTextFromHTML, shouldRenderAsHTML, fixEncodingIssues, formatEmailText, stripQuotedEmailHTML, stripQuotedEmailText, type EmailAttachment } from '@/utils/emailFormatting';
import { convertShortcodesToEmojis } from '@/utils/emojiUtils';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { EmojiAutocompleteInput } from '@/components/ui/emoji-autocomplete-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  MoreHorizontal, 
  Archive, 
  ArchiveRestore,
  Clock, 
  UserPlus, 
  Star,
  Paperclip,
  Send,
  RefreshCw,
  Smile,
  Bold,
  Italic,
  Link2,
  MessageSquare, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit2,
  UserCheck,
  Save,
  X,
  Trash2,
  Lock,
  MoreVertical,
  Edit3,
  Sparkles,
  Loader2,
  Move,
  ChevronLeft,
  ChevronRight,
  Reply
 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimezoneAwareDateTimePicker } from '@/components/ui/timezone-aware-datetime-picker';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';

interface ConversationViewProps {
  conversationId: string | null;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ conversationId }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { dateTime } = useDateFormatting();
  const { timezone } = useUserTimezone();
  const { hasPermission } = usePermissions();

  // State management
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignSelectedUserId, setAssignSelectedUserId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveSelectedInboxId, setMoveSelectedInboxId] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [snoozeDateTime, setSnoozeDateTime] = useState<Date | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [showCustomerInfo, setShowCustomerInfo] = useState(true);

  // Fetch conversation
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const { data, error } = await supabase.rpc('get_conversations');
      if (error) throw error;
      const foundConversation = data?.find((conv: any) => conv.id === conversationId);
      return foundConversation || null;
    },
    enabled: !!conversationId,
  });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId],
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
    enabled: !!conversationId,
  });

  // Fetch users for assignment
  const { data: assignUsers = [] } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name').order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch inboxes for moving
  const { data: moveInboxes = [] } = useQuery({
    queryKey: ['inboxes-for-move'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) throw error;
      return data || [];
    },
  });

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

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg mb-2">{t('conversation.notFound')}</p>
          <p className="text-sm">{t('conversation.mayHaveBeenDeleted')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gradient-surface">
      {/* Conversation Header */}
      <div className="h-16 flex-shrink-0 p-3 md:p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
             <Avatar className="h-10 w-10">
               <AvatarFallback>{(conversation.customer as any)?.full_name?.[0] || 'C'}</AvatarFallback>
             </Avatar>
             <div>
               <h2 className="font-semibold text-foreground text-sm md:text-base line-clamp-1">{conversation.subject}</h2>
               <div className="flex items-center space-x-2 text-xs md:text-sm text-muted-foreground">
                 <span className="truncate">{(conversation.customer as any)?.full_name || t('conversation.unknownCustomer')}</span>
                 <span className="hidden sm:inline">•</span>
                 <span className="hidden sm:inline truncate">{(conversation.customer as any)?.email}</span>
                <span className="hidden sm:inline">•</span>
                <Badge variant="outline" className="text-xs">
                  {conversation.channel}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 md:space-x-2">
            <Badge variant={conversation.status === 'open' ? 'default' : 'secondary'}>
              {t(`conversation.${conversation.status}`)}
            </Badge>
            <Badge variant={conversation.priority === 'high' || conversation.priority === 'urgent' ? 'destructive' : 'secondary'}>
              {t(`conversation.${conversation.priority}`)}
            </Badge>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 h-0 flex">
        {/* Messages Area */}
        <div className="flex-1">
          <div 
            style={{ height: 'calc(100vh - 180px)', overflow: 'auto' }}
            className="p-3 md:p-6"
          >
            <div className="space-y-4 max-w-4xl mx-auto w-full">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t('conversation.noMessages')}</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isFromCustomer = message.sender_type === 'customer';
                  const processedContent = shouldRenderAsHTML(message.content, message.content_type || 'text/plain')
                    ? sanitizeEmailHTML(message.content)
                    : formatEmailText(message.content);
                  
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
                                 {isFromCustomer ? (conversation.customer as any)?.full_name || t('conversation.customer') : message.sender_id || t('conversation.agent')}
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
                        <div className="email-container">
                          {shouldRenderAsHTML(message.content, message.content_type || 'text/plain') ? (
                            <div 
                              className="email-content prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: processedContent }}
                            />
                          ) : (
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {processedContent}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Customer Info Sidebar */}
        <div className="hidden lg:block w-80 border-l border-border bg-card/50 backdrop-blur-sm">
          <div 
            style={{ height: 'calc(100vh - 180px)', overflow: 'auto' }}
            className="p-4 space-y-6"
          >
            {/* Customer Details */}
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center">
                <UserCheck className="h-4 w-4 mr-2" />
                {t('conversation.customerDetails')}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{(conversation.customer as any)?.full_name?.[0] || 'C'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{(conversation.customer as any)?.full_name || t('conversation.unknownCustomer')}</div>
                    <div className="text-xs text-muted-foreground">{(conversation.customer as any)?.email}</div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center">
                <Star className="h-4 w-4 mr-2" />
                {t('conversation.quickActions')}
              </h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('conversation.assignTo')}
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Archive className="h-4 w-4 mr-2" />
                  {t('conversation.archive')}
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  {t('conversation.snooze')}
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('conversation.markResolved')}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Customer Notes */}
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center">
                <Edit3 className="h-4 w-4 mr-2" />
                {t('conversation.customerNotes')}
              </h3>
              <div className="space-y-2">
                <Textarea 
                  placeholder={t('conversation.addNote')}
                  className="text-xs min-h-[80px]"
                />
                <Button size="sm" className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {t('conversation.saveNote')}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Conversation History */}
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('conversation.conversationHistory')}
              </h3>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Messages: {messages.length}</div>
                <div>Received: {conversation.received_at ? dateTime(conversation.received_at) : 'N/A'}</div>
                <div>Last updated: {conversation.updated_at ? dateTime(conversation.updated_at) : 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};