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
import { EmailRender } from '@/components/ui/email-render';
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
  Reply,
  Users,
  MessageCircle
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
import { cn } from "@/lib/utils";
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useResizablePanels } from '@/hooks/useResizablePanels';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLayoutPresets } from '@/hooks/useLayoutPresets';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';
import { LayoutPresetManager } from '@/components/ui/layout-preset-manager';
import { MobileDrawerSidebar } from '@/components/ui/mobile-drawer-sidebar';
import { ResizeIndicator, SnapPositionIndicators } from '@/components/ui/resize-visual-indicators';
import { CustomerNotes } from './CustomerNotes';
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
  const { user } = useAuth();

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
  const [sendLoading, setSendLoading] = useState(false);
  const [showReplyArea, setShowReplyArea] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Responsive hooks
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  
  // Panel persistence with enhanced features
  const {
    panelSizes,
    getPanelSize,
    updatePanelSize,
    resetPanelSizes,
    isResizing,
    handleResizeStart,
    handleResizeEnd,
    snapPositions
  } = useResizablePanels({
    storageKey: 'conversation-view-panels',
    defaultSizes: {
      messages: isMobile ? 100 : 70,
      sidebar: isMobile ? 0 : 30
    },
    minSizes: {
      messages: isMobile ? 100 : 50,
      sidebar: isMobile ? 0 : 20
    },
    viewportAware: true,
    enableSnapPositions: true
  });

  // Layout presets integration
  const presetManager = useLayoutPresets({
    storageKey: 'conversation-view-panels',
    onApplyPreset: (sizes) => {
      Object.entries(sizes).forEach(([panelId, size]) => {
        updatePanelSize(panelId, size, true);
      });
    }
  });

  // Sidebar visibility state
  const [sidebarVisible, setSidebarVisible] = useState(!isMobile);
  
  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        description: 'Toggle sidebar',
        action: () => setSidebarVisible(!sidebarVisible)
      },
      {
        key: 'r',
        ctrlKey: true,
        shiftKey: true,
        description: 'Reset panel sizes',
        action: resetPanelSizes
      },
      {
        key: '1',
        ctrlKey: true,
        shiftKey: true,
        description: 'Apply compact layout',
        action: () => presetManager.applyPreset('compact')
      },
      {
        key: '2',
        ctrlKey: true,
        shiftKey: true,
        description: 'Apply balanced layout',
        action: () => presetManager.applyPreset('balanced')
      },
      {
        key: '3',
        ctrlKey: true,
        shiftKey: true,
        description: 'Apply focus layout',
        action: () => presetManager.applyPreset('focus')
      },
      {
        key: '4',
        ctrlKey: true,
        shiftKey: true,
        description: 'Apply wide info layout',
        action: () => presetManager.applyPreset('wide-info')
      }
    ]
  });

  // Update active preset when sizes change
  useEffect(() => {
    presetManager.updateActivePreset(panelSizes);
  }, [panelSizes, presetManager]);

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

  // Fetch assignable users for assignment dialog
  const { data: assignUsers = [] } = useQuery({
    queryKey: ['assignUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: assignDialogOpen,
  });

  // Fetch inboxes for move dialog
  const { data: moveInboxes = [] } = useQuery({
    queryKey: ['inboxes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inboxes')
        .select('id, name');
      if (error) throw error;
      return data || [];
    },
    enabled: moveDialogOpen,
  });

  // Mutation: Assign conversation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId || !assignSelectedUserId) throw new Error('Missing data');
      const { error } = await supabase
        .from('conversations')
        .update({ assigned_to_id: assignSelectedUserId })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('conversation.assignedSuccess'));
      setAssignDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      setAssignLoading(false);
    },
    onError: (error: any) => {
      toast.error(t('conversation.assignedError'));
      setAssignLoading(false);
    }
  });

  const handleAssign = () => {
    setAssignLoading(true);
    assignMutation.mutate();
  };

  // Mutation: Move conversation
  const moveMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId || !moveSelectedInboxId) throw new Error('Missing data');
      const { error } = await supabase
        .from('conversations')
        .update({ inbox_id: moveSelectedInboxId })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('conversation.movedSuccess'));
      setMoveDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      setMoveLoading(false);
    },
    onError: (error: any) => {
      toast.error(t('conversation.movedError'));
      setMoveLoading(false);
    }
  });

  const handleMove = () => {
    setMoveLoading(true);
    moveMutation.mutate();
  };

  // Mutation: Snooze conversation
  const snoozeMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId || !snoozeDate) throw new Error('Missing data');
      const snoozeDateTime = new Date(snoozeDate);
      const [hours, minutes] = snoozeTime.split(':').map(Number);
      snoozeDateTime.setHours(hours, minutes, 0, 0);
      const { error } = await supabase
        .from('conversations')
        .update({ snooze_until: snoozeDateTime.toISOString() })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('conversation.snoozedSuccess'));
      setSnoozeDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
    onError: (error: any) => {
      toast.error(t('conversation.snoozedError'));
    }
  });

  const handleSnooze = () => {
    snoozeMutation.mutate();
  };

  // Mutation: Delete message
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('conversation.messageDeleted'));
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
      queryClient.invalidateQueries(['messages', conversationId]);
    },
    onError: (error: any) => {
      toast.error(t('conversation.messageDeleteError'));
    }
  });

  const handleDeleteMessage = (messageId: string) => {
    deleteMessageMutation.mutate(messageId);
  };

  // Mutation: Send reply
  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) throw new Error('Missing conversation');
      if (!replyText.trim()) throw new Error('Empty reply');
      const newMessage = {
        conversation_id: conversationId,
        content: replyText,
        content_type: 'text/plain',
        sender_type: isInternalNote ? 'agent' : 'customer',
        is_internal: isInternalNote,
        sender_id: user?.id,
        created_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from('messages')
        .insert(newMessage);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('conversation.replySent'));
      setReplyText('');
      setIsInternalNote(false);
      setShowReplyArea(false);
      queryClient.invalidateQueries(['messages', conversationId]);
    },
    onError: (error: any) => {
      toast.error(t('conversation.replyError'));
    }
  });

  const handleSendReply = () => {
    setSendLoading(true);
    sendReplyMutation.mutate(undefined, {
      onSettled: () => setSendLoading(false)
    });
  };

  // Mutation: Edit message
  const editMessageMutation = useMutation({
    mutationFn: async () => {
      if (!editingMessageId) throw new Error('No message to edit');
      if (!editText.trim()) throw new Error('Empty edit');
      const { error } = await supabase
        .from('messages')
        .update({ content: editText })
        .eq('id', editingMessageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('conversation.messageEdited'));
      setEditingMessageId(null);
      setEditText('');
      queryClient.invalidateQueries(['messages', conversationId]);
    },
    onError: (error: any) => {
      toast.error(t('conversation.messageEditError'));
    }
  });

  const handleEditMessage = () => {
    editMessageMutation.mutate();
  };

  // Visual indicators
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Mobile view with enhanced drawer
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarVisible(!sidebarVisible)}
            >
              {!sidebarVisible ? <Users /> : <MessageCircle />}
              {!sidebarVisible ? 'Show Customer Info' : 'Show Messages'}
            </Button>
            
            <LayoutPresetManager
              storageKey="conversation-view-panels"
              currentSizes={panelSizes}
              onApplyPreset={(sizes) => {
                Object.entries(sizes).forEach(([panelId, size]) => {
                  updatePanelSize(panelId, size, true);
                });
              }}
              className="text-xs"
            />
          </div>
          
          <Badge variant="outline" className="text-xs">
            Current: {!sidebarVisible ? 'Messages' : 'Customer Info'}
          </Badge>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {!sidebarVisible ? (
            <div className="h-full flex flex-col">
              {/* Message header and content */}
              <ScrollArea className="flex-1 pane">
                <div 
                  ref={messagesContainerRef}
                  className="p-6"
                >
                  <div className="space-y-4 w-full" style={{ paddingBottom: showReplyArea ? '320px' : '60px' }}>
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
                                      {isFromCustomer ? conversation?.customer?.full_name || t('conversation.customer') : message.sender_id || t('conversation.agent')}
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

                    {/* Reply Area */}
                    {conversation?.status === 'open' && !conversation.is_archived && showReplyArea && (
                      <div className="mt-8 p-4 space-y-4 w-full border-t border-border bg-card/50 rounded-lg">
                        <Textarea
                          ref={replyRef}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={t('conversation.replyPlaceholder')}
                          rows={4}
                          className="resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsInternalNote(!isInternalNote)}
                              className={cn(isInternalNote ? 'bg-primary text-primary-foreground' : '')}
                            >
                              {t('conversation.internalNote')}
                            </Button>
                            <EmojiPicker
                              onSelect={(emoji) => setReplyText((prev) => prev + emoji.native)}
                            >
                              <Button variant="outline" size="sm">
                                <Smile className="h-4 w-4" />
                              </Button>
                            </EmojiPicker>
                          </div>
                          <Button
                            onClick={handleSendReply}
                            disabled={sendLoading || !replyText.trim()}
                            size="sm"
                          >
                            {sendLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {t('conversation.send')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <CustomerNotes 
              customerId={conversation?.customer.id}
              className="h-full"
            />
          )}
        </div>
        
        {/* Enhanced Mobile Drawer for Customer Info */}
        <MobileDrawerSidebar
          isOpen={sidebarVisible && conversation?.customer?.id}
          onClose={() => setSidebarVisible(false)}
          onToggle={() => setSidebarVisible(!sidebarVisible)}
          title="Customer Information"
        >
          <CustomerNotes 
            customerId={conversation?.customer.id}
            className="h-full"
          />
        </MobileDrawerSidebar>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      {/* Resize Visual Indicators */}
      <ResizeIndicator
        isResizing={isResizing}
        currentSize={getPanelSize('sidebar')}
        snapPositions={snapPositions}
      />
      
      <SnapPositionIndicators
        snapPositions={snapPositions}
        currentSize={getPanelSize('sidebar')}
        isVisible={isResizing}
        containerRef={containerRef}
        orientation="horizontal"
      />
      
      {/* Enhanced Controls */}
      <div className="flex items-center justify-between gap-2 mb-4 p-4 border-b bg-card/50">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            title="Toggle sidebar (Ctrl+Shift+S)"
          >
            {!sidebarVisible ? <ChevronLeft /> : <ChevronRight />}
            {!sidebarVisible ? 'Show' : 'Hide'} Customer Info
          </Button>
          
          <Badge variant="outline" className="text-xs">
            Messages: {Math.round(getPanelSize('messages'))}% | 
            Sidebar: {Math.round(getPanelSize('sidebar'))}%
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <LayoutPresetManager
            storageKey="conversation-view-panels"
            currentSizes={panelSizes}
            onApplyPreset={(sizes) => {
              Object.entries(sizes).forEach(([panelId, size]) => {
                updatePanelSize(panelId, size, true);
              });
            }}
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetPanelSizes}
            title="Reset to default layout (Ctrl+Shift+R)"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Enhanced Resizable Layout */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup 
          direction="horizontal" 
          className="h-full"
          onLayout={(sizes) => {
            updatePanelSize('messages', sizes[0] || 70);
            updatePanelSize('sidebar', sizes[1] || 30);
            presetManager.updateActivePreset({
              messages: sizes[0] || 70,
              sidebar: sizes[1] || 30
            });
          }}
        >
          <ResizablePanel 
            defaultSize={getPanelSize('messages')}
            minSize={50}
            className="flex flex-col resize-panel"
            onResize={(size) => updatePanelSize('messages', size)}
          >
            <ScrollArea className="flex-1 pane">
              <div 
                ref={messagesContainerRef}
                className="p-6"
              >
                <div className="space-y-4 w-full" style={{ paddingBottom: showReplyArea ? '320px' : '60px' }}>
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
                                    {isFromCustomer ? conversation?.customer?.full_name || t('conversation.customer') : message.sender_id || t('conversation.agent')}
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

                  {/* Reply Area */}
                  {conversation?.status === 'open' && !conversation.is_archived && showReplyArea && (
                    <div className="mt-8 p-4 space-y-4 w-full border-t border-border bg-card/50 rounded-lg">
                      <Textarea
                        ref={replyRef}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={t('conversation.replyPlaceholder')}
                        rows={4}
                        className="resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsInternalNote(!isInternalNote)}
                            className={cn(isInternalNote ? 'bg-primary text-primary-foreground' : '')}
                          >
                            {t('conversation.internalNote')}
                          </Button>
                          <EmojiPicker
                            onSelect={(emoji) => setReplyText((prev) => prev + emoji.native)}
                          >
                            <Button variant="outline" size="sm">
                              <Smile className="h-4 w-4" />
                            </Button>
                          </EmojiPicker>
                        </div>
                        <Button
                          onClick={handleSendReply}
                          disabled={sendLoading || !replyText.trim()}
                          size="sm"
                        >
                          {sendLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          {t('conversation.send')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </ResizablePanel>
          
          <ResizableHandle 
            withHandle 
            className="resize-handle group"
            onDragging={(isDragging) => {
              if (isDragging) handleResizeStart();
              else handleResizeEnd();
            }}
          />
          
          {sidebarVisible && (
            <ResizablePanel 
              defaultSize={getPanelSize('sidebar')}
              minSize={20}
              maxSize={50}
              className="border-l resize-panel"
              onResize={(size) => updatePanelSize('sidebar', size)}
            >
              <CustomerNotes 
                customerId={conversation?.customer.id}
                className="h-full"
              />
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>

      {/* AI Suggestions Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Reply Suggestions
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {aiSuggestions.map((suggestion, index) => (
              <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <p className="text-sm">{suggestion}</p>
                  <div className="flex justify-end mt-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        setReplyText(suggestion);
                        setAiOpen(false);
                      }}
                    >
                      Use This Reply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Conversation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Select value={assignSelectedUserId} onValueChange={setAssignSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select user to assign to..." />
              </SelectTrigger>
              <SelectContent>
                {assignUsers.map((assignUser) => (
                  <SelectItem key={assignUser.id} value={assignUser.user_id}>
                    {assignUser.full_name || assignUser.user_id}
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
              disabled={!assignSelectedUserId || assignLoading}
            >
              {assignLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                <SelectValue placeholder="Select inbox to move to..." />
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
              disabled={!moveSelectedInboxId || moveLoading}
            >
              {moveLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            <div>
              <label className="text-sm font-medium">Snooze until:</label>
              <TimezoneAwareDateTimePicker
                value={snoozeDate}
                onChange={setSnoozeDate}
                timeValue={snoozeTime}
                onTimeChange={setSnoozeTime}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnoozeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSnooze} 
              disabled={!snoozeDate || snoozeMutation.isPending}
            >
              {snoozeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Snooze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (messageToDelete) {
                  handleDeleteMessage(messageToDelete);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
