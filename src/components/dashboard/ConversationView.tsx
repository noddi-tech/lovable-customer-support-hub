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
  const [snoozeDate, setSnoozeDate] = useState<Date | undefined>(undefined);
  const [snoozeTime, setSnoozeTime] = useState<string>('09:00');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [showCustomerInfo, setShowCustomerInfo] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [showReplyArea, setShowReplyArea] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when reply area is opened
  useEffect(() => {
    if (showReplyArea && messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current?.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [showReplyArea]);

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
      const { data, error } = await supabase.from('profiles').select('id, user_id, full_name').order('full_name');
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

  // Mutations
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

  const assignMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!conversationId) throw new Error('No conversation ID');
      const { error } = await supabase
        .from('conversations')
        .update({ assigned_to_id: userId })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setAssignDialogOpen(false);
      toast.success('Conversation assigned successfully');
    },
    onError: (error) => {
      toast.error('Failed to assign: ' + error.message);
    },
  });

  const moveMutation = useMutation({
    mutationFn: async (inboxId: string) => {
      if (!conversationId) throw new Error('No conversation ID');
      const { error } = await supabase
        .from('conversations')
        .update({ inbox_id: inboxId })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMoveDialogOpen(false);
      toast.success('Conversation moved successfully');
    },
    onError: (error) => {
      toast.error('Failed to move: ' + error.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, isArchived }: { status?: string; isArchived?: boolean }) => {
      if (!conversationId) throw new Error('No conversation ID');
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (isArchived !== undefined) updates.is_archived = isArchived;
      
      const { error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Status updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId || !snoozeDate) throw new Error('No conversation ID or date');
      
      // Combine date and time
      const [hours, minutes] = snoozeTime.split(':').map(Number);
      const snoozeDateTime = new Date(snoozeDate);
      snoozeDateTime.setHours(hours, minutes, 0, 0);
      
      const { error } = await supabase
        .from('conversations')
        .update({ snooze_until: snoozeDateTime.toISOString() })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSnoozeDialogOpen(false);
      setSnoozeDate(undefined);
      setSnoozeTime('09:00');
      toast.success('Conversation snoozed successfully');
    },
    onError: (error) => {
      toast.error('Failed to snooze: ' + error.message);
    },
  });

  // AI Suggestions
  const getAiSuggestions = async () => {
    if (!conversationId || messages.length === 0) return;
    
    setAiLoading(true);
    try {
      const lastCustomerMessage = [...messages].reverse().find(m => m.sender_type === 'customer');
      if (!lastCustomerMessage) {
        toast.error('No customer message found for AI suggestions');
        return;
      }

      const { data, error } = await supabase.functions.invoke('suggest-replies', {
        body: { customerMessage: lastCustomerMessage.content }
      });

      if (error) throw error;
      
      setAiSuggestions(data.suggestions || []);
      setAiOpen(true);
    } catch (error: any) {
      toast.error('Failed to get AI suggestions: ' + error.message);
    } finally {
      setAiLoading(false);
    }
  };

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

  const handleAssign = () => {
    if (assignSelectedUserId) {
      assignMutation.mutate(assignSelectedUserId);
    }
  };

  const handleMove = () => {
    if (moveSelectedInboxId) {
      moveMutation.mutate(moveSelectedInboxId);
    }
  };

  const handleSnooze = () => {
    if (snoozeDate) {
      snoozeMutation.mutate();
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
            
            <div className="hidden sm:flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('conversation.assign')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMoveDialogOpen(true)}>
                <Move className="h-4 w-4 mr-2" />
                {t('conversation.move')}
              </Button>
              {conversation.status === 'open' ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => updateStatusMutation.mutate({ status: 'closed' })}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('conversation.markAsClosed')}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => updateStatusMutation.mutate({ status: 'open' })}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {t('conversation.reopen')}
                </Button>
              )}
              {conversation.is_archived ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => updateStatusMutation.mutate({ isArchived: false })}
                >
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  {t('conversation.unarchive')}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => updateStatusMutation.mutate({ isArchived: true })}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {t('conversation.archive')}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setSnoozeDialogOpen(true)}>
                <Clock className="h-4 w-4 mr-2" />
                {t('conversation.snooze')}
              </Button>
            </div>
            
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Area - Only Messages, Scrollable */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-3 md:p-6" 
            style={{ 
              maxHeight: showReplyArea ? 'calc(100vh - 400px)' : 'calc(100vh - 220px)'
            }}
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
                  const shouldUseHTML = shouldRenderAsHTML(message.content, message.content_type || 'text/plain');
                  const processedContent = shouldUseHTML
                    ? DOMPurify.sanitize(sanitizeEmailHTML(message.content))
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
                          {shouldUseHTML ? (
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

          {/* Fixed Reply Toolbar - Always Visible at Bottom */}
          {conversation.status === 'open' && !conversation.is_archived && (
            <div className="flex-shrink-0 border-t border-border bg-card/95 backdrop-blur-sm shadow-lg">
              {!showReplyArea ? (
                /* Collapsed Reply Button */
                <div className="p-4 flex justify-center">
                  <Button 
                    onClick={() => setShowReplyArea(true)}
                    className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-lg"
                    size="lg"
                  >
                    <Reply className="h-5 w-5 mr-2" />
                    Reply to this conversation
                  </Button>
                </div>
              ) : (
                /* Expanded Reply Area */
                <div className="p-4 space-y-4 max-w-4xl mx-auto w-full">
                  {/* Quick Reply Header */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          A
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">Reply to this conversation</div>
                        <div className="text-xs text-muted-foreground">Type your response or use AI suggestions</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={getAiSuggestions}
                        disabled={aiLoading}
                        className="text-primary hover:text-primary/80"
                      >
                        {aiLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        AI Suggest
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowReplyArea(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Reply Form */}
                  <div className="space-y-3">
                    {/* Reply Type Toggle */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={isInternalNote ? "outline" : "default"}
                        size="sm"
                        onClick={() => setIsInternalNote(false)}
                        className="flex-1 max-w-[120px]"
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                      <Button
                        variant={isInternalNote ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsInternalNote(true)}
                        className="flex-1 max-w-[140px]"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Internal Note
                      </Button>
                    </div>

                    {/* Text Area */}
                    <div className="relative">
                      <Textarea
                        ref={replyRef}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={isInternalNote ? "Write an internal note..." : "Type your reply here..."}
                        className="min-h-[100px] pr-32 text-base border-2 border-border focus:border-primary/50 rounded-lg resize-none"
                      />
                      
                      {/* Action Buttons - Right Side */}
                      <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                          <Smile className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Send Actions Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">Ctrl</kbd>
                          <span>+</span>
                          <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">Enter</kbd>
                          <span>to send</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Button variant="outline" size="sm" onClick={() => setReplyText('')} disabled={sendLoading}>
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          disabled={!replyText.trim() || sendLoading}
                          onClick={handleSendReply}
                          className="min-w-[100px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                        >
                          {sendLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          {isInternalNote ? 'Add Note' : 'Send Reply'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setAssignDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('conversation.assignTo')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => updateStatusMutation.mutate({ isArchived: !conversation.is_archived })}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {conversation.is_archived ? t('conversation.unarchive') : t('conversation.archive')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setSnoozeDialogOpen(true)}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {t('conversation.snooze')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => updateStatusMutation.mutate({ status: conversation.status === 'open' ? 'closed' : 'open' })}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {conversation.status === 'open' ? t('conversation.markAsClosed') : t('conversation.reopen')}
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

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={assignSelectedUserId} onValueChange={setAssignSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select user to assign" />
              </SelectTrigger>
              <SelectContent>
                {assignUsers.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!assignSelectedUserId || assignMutation.isPending}
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={moveSelectedInboxId} onValueChange={setMoveSelectedInboxId}>
              <SelectTrigger>
                <SelectValue placeholder="Select inbox to move to" />
              </SelectTrigger>
              <SelectContent>
                {moveInboxes.map((inbox) => (
                  <SelectItem key={inbox.id} value={inbox.id}>
                    {inbox.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMove}
              disabled={!moveSelectedInboxId || moveMutation.isPending}
            >
              {moveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snooze Dialog */}
      <Dialog open={snoozeDialogOpen} onOpenChange={setSnoozeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Snooze Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <TimezoneAwareDateTimePicker
              date={snoozeDate}
              time={snoozeTime}
              onDateChange={setSnoozeDate}
              onTimeChange={setSnoozeTime}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnoozeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSnooze}
              disabled={!snoozeDate || snoozeMutation.isPending}
            >
              {snoozeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Snooze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Reply Suggestions</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {aiSuggestions.map((suggestion, index) => (
              <div key={index} className="p-3 border rounded-lg cursor-pointer hover:bg-accent"
                   onClick={() => {
                     setReplyText(suggestion.reply);
                     setAiOpen(false);
                   }}>
                <p className="text-sm">{suggestion.reply}</p>
                {suggestion.title && (
                  <p className="text-xs text-muted-foreground mt-1">{suggestion.title}</p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};