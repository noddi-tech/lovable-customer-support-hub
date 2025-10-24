import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

interface ConversationViewState {
  replyText: string;
  isInternalNote: boolean;
  editingMessageId: string | null;
  editText: string;
  aiOpen: boolean;
  aiLoading: boolean;
  aiSuggestions: any[];
  translateOpen: boolean;
  translateLoading: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  assignDialogOpen: boolean;
  assignSelectedUserId: string;
  assignLoading: boolean;
  moveDialogOpen: boolean;
  moveSelectedInboxId: string;
  moveLoading: boolean;
  snoozeDialogOpen: boolean;
  snoozeDate: Date | undefined;
  snoozeTime: string;
  tagDialogOpen: boolean;
  deleteDialogOpen: boolean;
  messageToDelete: string | null;
  showCustomerInfo: boolean;
  sendLoading: boolean;
  showReplyArea: boolean;
}

type ConversationViewAction =
  | { type: 'SET_REPLY_TEXT'; payload: string }
  | { type: 'SET_IS_INTERNAL_NOTE'; payload: boolean }
  | { type: 'SET_EDITING_MESSAGE'; payload: { id: string | null; text: string } }
  | { type: 'SET_AI_STATE'; payload: { open: boolean; loading: boolean; suggestions: any[] } }
  | { type: 'SET_TRANSLATE_STATE'; payload: { open: boolean; loading: boolean; sourceLanguage: string; targetLanguage: string } }
  | { type: 'SET_ASSIGN_DIALOG'; payload: { open: boolean; userId: string; loading: boolean } }
  | { type: 'SET_MOVE_DIALOG'; payload: { open: boolean; inboxId: string; loading: boolean } }
  | { type: 'SET_SNOOZE_DIALOG'; payload: { open: boolean; date: Date | undefined; time: string } }
  | { type: 'SET_TAG_DIALOG'; payload: boolean }
  | { type: 'SET_DELETE_DIALOG'; payload: { open: boolean; messageId: string | null } }
  | { type: 'SET_CUSTOMER_INFO'; payload: boolean }
  | { type: 'SET_SEND_LOADING'; payload: boolean }
  | { type: 'SET_SHOW_REPLY_AREA'; payload: boolean };

const initialState: ConversationViewState = {
  replyText: '',
  isInternalNote: false,
  editingMessageId: null,
  editText: '',
  aiOpen: false,
  aiLoading: false,
  aiSuggestions: [],
  translateOpen: false,
  translateLoading: false,
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  assignDialogOpen: false,
  assignSelectedUserId: '',
  assignLoading: false,
  moveDialogOpen: false,
  moveSelectedInboxId: '',
  moveLoading: false,
  snoozeDialogOpen: false,
  snoozeDate: undefined,
  snoozeTime: '09:00',
  tagDialogOpen: false,
  deleteDialogOpen: false,
  messageToDelete: null,
  showCustomerInfo: true,
  sendLoading: false,
  showReplyArea: false,
};

function conversationViewReducer(state: ConversationViewState, action: ConversationViewAction): ConversationViewState {
  switch (action.type) {
    case 'SET_REPLY_TEXT':
      return { ...state, replyText: action.payload };
    case 'SET_IS_INTERNAL_NOTE':
      return { ...state, isInternalNote: action.payload };
    case 'SET_EDITING_MESSAGE':
      return { ...state, editingMessageId: action.payload.id, editText: action.payload.text };
    case 'SET_AI_STATE':
      return { ...state, aiOpen: action.payload.open, aiLoading: action.payload.loading, aiSuggestions: action.payload.suggestions };
    case 'SET_TRANSLATE_STATE':
      return { ...state, translateOpen: action.payload.open, translateLoading: action.payload.loading, sourceLanguage: action.payload.sourceLanguage, targetLanguage: action.payload.targetLanguage };
    case 'SET_ASSIGN_DIALOG':
      return { ...state, assignDialogOpen: action.payload.open, assignSelectedUserId: action.payload.userId, assignLoading: action.payload.loading };
    case 'SET_MOVE_DIALOG':
      return { ...state, moveDialogOpen: action.payload.open, moveSelectedInboxId: action.payload.inboxId, moveLoading: action.payload.loading };
    case 'SET_SNOOZE_DIALOG':
      return { ...state, snoozeDialogOpen: action.payload.open, snoozeDate: action.payload.date, snoozeTime: action.payload.time };
    case 'SET_TAG_DIALOG':
      return { ...state, tagDialogOpen: action.payload };
    case 'SET_DELETE_DIALOG':
      return { ...state, deleteDialogOpen: action.payload.open, messageToDelete: action.payload.messageId };
    case 'SET_CUSTOMER_INFO':
      return { ...state, showCustomerInfo: action.payload };
    case 'SET_SEND_LOADING':
      return { ...state, sendLoading: action.payload };
    case 'SET_SHOW_REPLY_AREA':
      return { ...state, showReplyArea: action.payload };
    default:
      return state;
  }
}

interface ConversationViewContextType {
  state: ConversationViewState;
  dispatch: React.Dispatch<ConversationViewAction>;
  conversation: any;
  messages: any[];
  assignUsers: any[];
  moveInboxes: any[];
  isLoading: boolean;
  messagesLoading: boolean;
  sendReply: (content: string, isInternal: boolean, status?: string) => Promise<void>;
  assignConversation: (userId: string) => Promise<void>;
  moveConversation: (inboxId: string) => Promise<void>;
  updateStatus: (updates: { status?: string; isArchived?: boolean }) => Promise<void>;
  snoozeConversation: () => Promise<void>;
  getAiSuggestions: () => Promise<void>;
  translateText: (text: string, sourceLanguage: string, targetLanguage: string) => Promise<string>;
  refreshConversation: () => Promise<void>;
  addTag: (tag: string) => Promise<void>;
  removeTag: (tag: string) => Promise<void>;
}

const ConversationViewContext = createContext<ConversationViewContextType | undefined>(undefined);

interface ConversationViewProviderProps {
  children: ReactNode;
  conversationId: string | null;
}

export const ConversationViewProvider = ({ children, conversationId }: ConversationViewProviderProps) => {
  const [state, dispatch] = useReducer(conversationViewReducer, initialState);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch conversation
  const { data: conversation, isLoading } = useQuery({
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

  // Fetch messages with optimized query
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId, user?.id],
    queryFn: async () => {
      if (!conversationId) return [];
      
      console.log('Fetching messages for conversation:', conversationId);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          content_type,
          sender_type,
          sender_id,
          is_internal,
          attachments,
          created_at,
          assigned_to_id,
          email_subject,
          email_headers
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      console.log('Messages fetched:', data?.length || 0);
      return data || [];
    },
    enabled: !!conversationId && !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes - longer cache
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in memory longer
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!conversationId || !user) return;
    
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('Real-time message update:', payload);
        queryClient.invalidateQueries({ 
          queryKey: ['thread-messages', conversationId, user.id] 
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, queryClient]);

  // Auto-mark as read when conversation is opened and unread
  useEffect(() => {
    if (conversation && conversation.is_read === false && conversationId) {
      autoMarkAsReadMutation.mutate(conversationId);
    }
  }, [conversation?.is_read, conversationId]);

  // Fetch users for assignment
  const { data: assignUsers = [] } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, user_id, full_name').order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch inboxes for moving
  const { data: moveInboxes = [] } = useQuery({
    queryKey: ['inboxes-for-move'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async ({ content, isInternal, status }: { content: string; isInternal: boolean; status?: string }) => {
      if (!conversationId) throw new Error('No conversation ID');

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

      // Update conversation status after agent reply (only for non-internal messages)
      if (!isInternal && status) {
        const { error: updateError } = await supabase
          .from('conversations')
          .update({
            status,
            is_read: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);
        
        if (updateError) {
          logger.warn('Failed to update conversation status', updateError, 'ConversationViewProvider');
        }
      }

      if (!isInternal) {
        const { error: emailError } = await supabase.functions.invoke('send-reply-email', {
          body: { messageId: message.id }
        });
        
        if (emailError) {
          logger.warn('Email sending failed', emailError, 'ConversationViewProvider');
          toast.warning('Reply saved but email sending failed');
        }
      }

      return message;
    },
    onSuccess: (newMessage) => {
      dispatch({ type: 'SET_REPLY_TEXT', payload: '' });
      
      // Optimistically update messages cache instead of invalidating
      queryClient.setQueryData(['messages', conversationId, user?.id], (old: any[]) => {
        return old ? [...old, newMessage] : [newMessage];
      });
      
      // Only invalidate essential queries
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
      toast.success(state.isInternalNote ? 'Internal note added' : 'Reply sent successfully');
    },
    onError: (error) => {
      logger.error('Failed to send reply', error, 'ConversationViewProvider');
      toast.error('Failed to send reply: ' + error.message);
    },
  });

  // Assign conversation mutation
  const assignMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!conversationId) throw new Error('No conversation ID');
      const { error } = await supabase
        .from('conversations')
        .update({ assigned_to_id: userId })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: (assignedUserId) => {
      // Optimistically update conversation cache
      queryClient.setQueryData(['conversation', conversationId, user?.id], (old: any) => {
        if (old) return { ...old, assigned_to_id: assignedUserId };
        return old;
      });
      
      // Only invalidate counts
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
      dispatch({ type: 'SET_ASSIGN_DIALOG', payload: { open: false, userId: '', loading: false } });
      toast.success('Conversation assigned successfully');
    },
    onError: (error) => {
      logger.error('Failed to assign conversation', error, 'ConversationViewProvider');
      toast.error('Failed to assign: ' + error.message);
    },
  });

  // Move conversation mutation
  const moveMutation = useMutation({
    mutationFn: async (inboxId: string) => {
      if (!conversationId) throw new Error('No conversation ID');
      const { error } = await supabase
        .from('conversations')
        .update({ inbox_id: inboxId })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: (inboxId) => {
      // Optimistically update conversation cache
      queryClient.setQueryData(['conversation', conversationId, user?.id], (old: any) => {
        if (old) return { ...old, inbox_id: inboxId };
        return old;
      });
      
      // Only invalidate counts
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
      dispatch({ type: 'SET_MOVE_DIALOG', payload: { open: false, inboxId: '', loading: false } });
      toast.success('Conversation moved successfully');
    },
    onError: (error) => {
      logger.error('Failed to move conversation', error, 'ConversationViewProvider');
      toast.error('Failed to move: ' + error.message);
    },
  });

  // Update status mutation
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
      // Optimistically update conversation cache using status and archived updates
      queryClient.setQueryData(['conversation', conversationId, user?.id], (old: any) => {
        if (old) {
          const updates: any = {};
          if (state.snoozeDate) updates.status = 'snoozed';
          return { ...old, ...updates };
        }
        return old;
      });
      
      // Only invalidate counts
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
      toast.success('Status updated successfully');
    },
    onError: (error) => {
      logger.error('Failed to update status', error, 'ConversationViewProvider');
      toast.error('Failed to update status: ' + error.message);
    },
  });

  // Snooze conversation mutation
  const snoozeMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId || !state.snoozeDate) throw new Error('No conversation ID or date');
      
      const [hours, minutes] = state.snoozeTime.split(':').map(Number);
      const snoozeDateTime = new Date(state.snoozeDate);
      snoozeDateTime.setHours(hours, minutes, 0, 0);
      
      const { error } = await supabase
        .from('conversations')
        .update({ snooze_until: snoozeDateTime.toISOString() })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Optimistically update conversation cache
      queryClient.setQueryData(['conversation', conversationId, user?.id], (old: any) => {
        if (old) {
          const [hours, minutes] = state.snoozeTime.split(':').map(Number);
          const snoozeDateTime = new Date(state.snoozeDate!);
          snoozeDateTime.setHours(hours, minutes, 0, 0);
          return { ...old, snooze_until: snoozeDateTime.toISOString() };
        }
        return old;
      });
      
      // Only invalidate counts
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
      dispatch({ type: 'SET_SNOOZE_DIALOG', payload: { open: false, date: undefined, time: '09:00' } });
      toast.success('Conversation snoozed successfully');
    },
    onError: (error) => {
      logger.error('Failed to snooze conversation', error, 'ConversationViewProvider');
      toast.error('Failed to snooze: ' + error.message);
    },
  });

  // Auto-mark as read mutation (silent, no toast)
  const autoMarkAsReadMutation = useMutation({
    mutationFn: async (convId: string) => {
      const { error } = await supabase
        .from('conversations')
        .update({ is_read: true })
        .eq('id', convId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // 1. Update all conversation list caches directly for immediate UI update
      queryClient.setQueriesData(
        { queryKey: ['conversations'], exact: false },
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              conversations: page.conversations.map((conv: any) =>
                conv.id === conversationId 
                  ? { ...conv, is_read: true }
                  : conv
              )
            }))
          };
        }
      );
      
      // 2. Update single conversation caches
      queryClient.setQueryData(['conversation', conversationId, user?.id], (old: any) => {
        if (old) return { ...old, is_read: true };
        return old;
      });
      
      queryClient.setQueryData(['conversation-meta', conversationId, user?.id], (old: any) => {
        if (old) return { ...old, isRead: true };
        return old;
      });
      
      // 3. Force refetch counts for immediate update
      queryClient.refetchQueries({ queryKey: ['all-counts'] });
      queryClient.refetchQueries({ queryKey: ['conversation-counts'] });
    },
    onError: (error) => {
      logger.error('Failed to auto-mark as read', error, 'ConversationViewProvider');
    },
  });

  // Gmail sync mutation for refreshing message data
  const gmailSyncMutation = useMutation({
    mutationFn: async () => {
      if (!conversation?.email_account_id) throw new Error('No email account associated with conversation');
      
      const response = await fetch('/supabase/functions/v1/trigger-gmail-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailAccountId: conversation.email_account_id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Gmail sync completed - signatures should now display correctly');
    },
    onError: (error) => {
      logger.error('Gmail sync failed', error, 'ConversationViewProvider');
      toast.error('Gmail sync failed: ' + error.message);
    },
  });

  const sendReply = async (content: string, isInternal: boolean, status?: string) => {
    dispatch({ type: 'SET_SEND_LOADING', payload: true });
    try {
      await sendReplyMutation.mutateAsync({ content, isInternal, status });
    } finally {
      dispatch({ type: 'SET_SEND_LOADING', payload: false });
    }
  };

  const assignConversation = async (userId: string) => {
    await assignMutation.mutateAsync(userId);
  };

  const moveConversation = async (inboxId: string) => {
    await moveMutation.mutateAsync(inboxId);
  };

  const updateStatus = async (updates: { status?: string; isArchived?: boolean }) => {
    await updateStatusMutation.mutateAsync(updates);
  };

  const snoozeConversation = async () => {
    await snoozeMutation.mutateAsync();
  };

  const getAiSuggestions = async () => {
    if (!conversationId || messages.length === 0) return;
    
    dispatch({ type: 'SET_AI_STATE', payload: { open: false, loading: true, suggestions: [] } });
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
      
      dispatch({ type: 'SET_AI_STATE', payload: { open: true, loading: false, suggestions: data.suggestions || [] } });
    } catch (error: any) {
      logger.error('Failed to get AI suggestions', error, 'ConversationViewProvider');
      toast.error('Failed to get AI suggestions: ' + error.message);
      dispatch({ type: 'SET_AI_STATE', payload: { open: false, loading: false, suggestions: [] } });
    }
  };

  const translateText = async (text: string, sourceLanguage: string, targetLanguage: string): Promise<string> => {
    if (!text.trim()) return text;
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { 
          text: text.trim(),
          sourceLanguage,
          targetLanguage
        }
      });

      if (error) throw error;
      
      return data.translatedText || text;
    } catch (error: any) {
      logger.error('Failed to translate text', error, 'ConversationViewProvider');
      toast.error('Failed to translate text: ' + error.message);
      return text;
    }
  };

  const refreshConversation = async () => {
    await gmailSyncMutation.mutateAsync();
  };

  const addTag = async (tag: string) => {
    if (!conversationId || !conversation) return;
    
    const metadata = conversation.metadata as Record<string, any> || {};
    const currentTags = (metadata.tags || []) as string[];
    const newTags = [...currentTags, tag];
    
    const { error } = await supabase
      .from('conversations')
      .update({ 
        metadata: { ...metadata, tags: newTags }
      })
      .eq('id', conversationId);
      
    if (error) {
      toast.error('Failed to add tag');
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    toast.success('Tag added');
  };

  const removeTag = async (tag: string) => {
    if (!conversationId || !conversation) return;
    
    const metadata = conversation.metadata as Record<string, any> || {};
    const currentTags = (metadata.tags || []) as string[];
    const newTags = currentTags.filter((t: string) => t !== tag);
    
    const { error } = await supabase
      .from('conversations')
      .update({ 
        metadata: { ...metadata, tags: newTags }
      })
      .eq('id', conversationId);
      
    if (error) {
      toast.error('Failed to remove tag');
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    toast.success('Tag removed');
  };

  const value = {
    state,
    dispatch,
    conversation,
    messages,
    assignUsers,
    moveInboxes,
    isLoading,
    messagesLoading,
    sendReply,
    assignConversation,
    moveConversation,
    updateStatus,
    snoozeConversation,
    getAiSuggestions,
    translateText,
    refreshConversation,
    addTag,
    removeTag,
  };

  return (
    <ConversationViewContext.Provider value={value}>
      {children}
    </ConversationViewContext.Provider>
  );
};

export const useConversationView = () => {
  const context = useContext(ConversationViewContext);
  if (context === undefined) {
    throw new Error('useConversationView must be used within a ConversationViewProvider');
  }
  return context;
};