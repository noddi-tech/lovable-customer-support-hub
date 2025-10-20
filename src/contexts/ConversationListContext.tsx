import { createContext, useContext, useReducer, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

export type ConversationStatus = "open" | "pending" | "resolved" | "closed";
export type ConversationPriority = "low" | "normal" | "high" | "urgent";
export type ConversationChannel = "email" | "chat" | "social" | "facebook" | "instagram" | "whatsapp";
export type SortBy = "latest" | "oldest" | "priority" | "unread";

export interface Customer {
  id: string;
  full_name: string;
  email: string;
}

export interface AssignedTo {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export interface EmailAccount {
  id: string;
  email_address: string;
}

export interface Conversation {
  id: string;
  subject: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  is_read: boolean;
  is_archived?: boolean;
  channel: ConversationChannel;
  updated_at: string;
  received_at?: string;
  inbox_id?: string;
  customer?: Customer;
  assigned_to?: AssignedTo;
  email_account?: EmailAccount;
  snooze_until?: string;
  preview_text?: string;
  first_response_at?: string;
  sla_breach_at?: string;
  slaStatus?: 'on_track' | 'at_risk' | 'breached' | 'met';
}

interface ConversationListState {
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  sortBy: SortBy;
  deleteDialogOpen: boolean;
  conversationToDelete: string | null;
  showFilters: boolean;
  selectedConversations: Set<string>;
  bulkSelectionMode: boolean;
}

type ConversationListAction =
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: string }
  | { type: 'SET_PRIORITY_FILTER'; payload: string }
  | { type: 'SET_SORT_BY'; payload: SortBy }
  | { type: 'TOGGLE_FILTERS' }
  | { type: 'OPEN_DELETE_DIALOG'; payload: string }
  | { type: 'CLOSE_DELETE_DIALOG' }
  | { type: 'TOGGLE_BULK_SELECTION'; payload: { id: string; selected: boolean } }
  | { type: 'CLEAR_BULK_SELECTION' }
  | { type: 'TOGGLE_BULK_MODE' };

const initialState: ConversationListState = {
  searchQuery: '',
  statusFilter: 'all',
  priorityFilter: 'all',
  sortBy: 'latest',
  deleteDialogOpen: false,
  conversationToDelete: null,
  showFilters: false,
  selectedConversations: new Set(),
  bulkSelectionMode: false,
};

function conversationListReducer(state: ConversationListState, action: ConversationListAction): ConversationListState {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
    case 'SET_PRIORITY_FILTER':
      return { ...state, priorityFilter: action.payload };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    case 'TOGGLE_FILTERS':
      return { ...state, showFilters: !state.showFilters };
    case 'OPEN_DELETE_DIALOG':
      return { ...state, deleteDialogOpen: true, conversationToDelete: action.payload };
    case 'CLOSE_DELETE_DIALOG':
      return { ...state, deleteDialogOpen: false, conversationToDelete: null };
    case 'TOGGLE_BULK_SELECTION': {
      const newSelected = new Set(state.selectedConversations);
      if (action.payload.selected) {
        newSelected.add(action.payload.id);
      } else {
        newSelected.delete(action.payload.id);
      }
      return { ...state, selectedConversations: newSelected };
    }
    case 'CLEAR_BULK_SELECTION':
      return { ...state, selectedConversations: new Set() };
    case 'TOGGLE_BULK_MODE':
      return { ...state, bulkSelectionMode: !state.bulkSelectionMode, selectedConversations: new Set() };
    default:
      return state;
  }
}

interface ConversationListContextType {
  state: ConversationListState;
  dispatch: React.Dispatch<ConversationListAction>;
  conversations: Conversation[];
  isLoading: boolean;
  hasSessionError: boolean;
  archiveConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  markAllAsRead: () => void;
  isMarkingAllAsRead: boolean;
  filteredConversations: Conversation[];
  bulkMarkAsRead: () => void;
  bulkMarkAsUnread: () => void;
  bulkChangeStatus: (status: string) => void;
  bulkArchive: () => void;
  bulkDelete: () => void;
}

const ConversationListContext = createContext<ConversationListContextType | undefined>(undefined);

interface ConversationListProviderProps {
  children: ReactNode;
  selectedTab: string;
  selectedInboxId: string;
}

export const ConversationListProvider = ({ children, selectedTab, selectedInboxId }: ConversationListProviderProps) => {
  const [state, dispatch] = useReducer(conversationListReducer, initialState);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch conversations with optimized config
  const { data: conversations = [], isLoading, error } = useQuery({
    queryKey: ['conversations', user?.id],
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      logger.info('Fetching conversations for user', { userId: user?.id }, 'ConversationListProvider');
      
      const { data, error } = await supabase.rpc('get_conversations');

      if (error) {
        logger.error('Error fetching conversations', error, 'ConversationListProvider');
        // Check if it's a session error
        if (error?.code === 'PGRST301' || 
            error?.message?.includes('JWT expired') ||
            error?.message?.includes('auth.uid() is null') ||
            error?.code === 'PGRST116') {
          throw new Error('SESSION_ERROR');
        }
        return [];
      }
      
      logger.info('Conversations fetched successfully', { count: data?.length }, 'ConversationListProvider');
      return (data || []).map((conv: any) => ({
        ...conv,
        customer: conv.customer as Customer,
        assigned_to: conv.assigned_to as AssignedTo,
      })) as Conversation[];
    },
    retry: (failureCount, error: any) => {
      // Don't retry session errors
      if (error?.message === 'SESSION_ERROR') {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Detect session errors
  const hasSessionError = error?.message === 'SESSION_ERROR';

  // Archive conversation mutation
  const archiveConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          status: 'closed',
          is_archived: true 
        })
        .eq('id', conversationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      toast.success('Conversation archived successfully');
    },
    onError: (error) => {
      logger.error('Error archiving conversation', error, 'ConversationListProvider');
      toast.error('Failed to archive conversation');
    }
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      // First delete all messages in the conversation
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);
      
      if (messagesError) throw messagesError;

      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      
      if (conversationError) throw conversationError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      toast.success('Conversation deleted successfully');
      dispatch({ type: 'CLOSE_DELETE_DIALOG' });
    },
    onError: (error) => {
      logger.error('Error deleting conversation', error, 'ConversationListProvider');
      toast.error('Failed to delete conversation');
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // Get filtered conversations based on current state
      const effectiveInboxId = selectedTab.startsWith('inbox-')
        ? selectedTab.replace('inbox-', '')
        : (selectedInboxId !== 'all' ? selectedInboxId : null);

      const filteredConversations = conversations
        .filter((conversation) => {
          const matchesSearch = conversation.subject.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            conversation.customer?.full_name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            conversation.customer?.email.toLowerCase().includes(state.searchQuery.toLowerCase());
          
          const matchesStatus = state.statusFilter === "all" || conversation.status === state.statusFilter;
          const matchesPriority = state.priorityFilter === "all" || conversation.priority === state.priorityFilter;
          const matchesInbox = !effectiveInboxId || conversation.inbox_id === effectiveInboxId;
          
          const matchesTab = (() => {
            const isSnoozedActive = !!conversation.snooze_until && new Date(conversation.snooze_until) > new Date();
            switch (selectedTab) {
              case "snoozed":
                return isSnoozedActive;
              case "all":
                return conversation.status !== 'closed' && !isSnoozedActive;
              case "unread":
                return !conversation.is_read && !isSnoozedActive;
              case "assigned":
                return !!conversation.assigned_to && !isSnoozedActive;
              case "pending":
                return conversation.status === 'pending' && !isSnoozedActive;
              case "closed":
                return conversation.status === 'closed' && !isSnoozedActive;
              case "archived":
                return conversation.is_archived === true;
              case "email":
                return conversation.channel === "email" && !isSnoozedActive;
              case "facebook":
                return conversation.channel === "facebook" && !isSnoozedActive;
              case "instagram":
                return conversation.channel === "instagram" && !isSnoozedActive;
              case "whatsapp":
                return conversation.channel === "whatsapp" && !isSnoozedActive;
              default:
                if (selectedTab.startsWith('inbox-')) {
                  const inboxId = selectedTab.replace('inbox-', '');
                  return conversation.inbox_id === inboxId && !isSnoozedActive;
                }
                return !isSnoozedActive;
            }
          })();

          return matchesSearch && matchesStatus && matchesPriority && matchesInbox && matchesTab;
        });

      const unreadConversationIds = filteredConversations
        .filter(conv => !conv.is_read)
        .map(conv => conv.id);
      
      if (unreadConversationIds.length === 0) {
        throw new Error('No unread conversations to mark as read');
      }

      const { error } = await supabase
        .from('conversations')
        .update({ is_read: true })
        .in('id', unreadConversationIds);
      
      if (error) throw error;
      
      return unreadConversationIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      toast.success(`Marked ${count} conversations as read`);
    },
    onError: (error: any) => {
      logger.error('Error marking conversations as read', error, 'ConversationListProvider');
      if (error.message === 'No unread conversations to mark as read') {
        toast.info('No unread conversations to mark as read');
      } else {
        toast.error('Failed to mark conversations as read');
      }
    }
  });

  const archiveConversation = (id: string) => {
    archiveConversationMutation.mutate(id);
  };

  const deleteConversation = (id: string) => {
    if (state.conversationToDelete) {
      deleteConversationMutation.mutate(state.conversationToDelete);
    }
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Filter and sort conversations
  const effectiveInboxId = selectedTab.startsWith('inbox-')
    ? selectedTab.replace('inbox-', '')
    : (selectedInboxId !== 'all' ? selectedInboxId : null);

  const filteredAndSortedConversations = conversations
    .filter((conversation) => {
      const matchesSearch = conversation.subject.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        conversation.customer?.full_name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        conversation.customer?.email.toLowerCase().includes(state.searchQuery.toLowerCase());
      
      const matchesStatus = state.statusFilter === "all" || conversation.status === state.statusFilter;
      const matchesPriority = state.priorityFilter === "all" || conversation.priority === state.priorityFilter;
      const matchesInbox = !effectiveInboxId || conversation.inbox_id === effectiveInboxId;
      
      const matchesTab = (() => {
        const isSnoozedActive = !!conversation.snooze_until && new Date(conversation.snooze_until) > new Date();
        switch (selectedTab) {
          case "snoozed":
            return isSnoozedActive;
          case "all":
            return conversation.status !== 'closed' && !isSnoozedActive;
          case "unread":
            return !conversation.is_read && !isSnoozedActive;
          case "assigned":
            return !!conversation.assigned_to && !isSnoozedActive;
          case "pending":
            return conversation.status === 'pending' && !isSnoozedActive;
          case "closed":
            return conversation.status === 'closed' && !isSnoozedActive;
          case "archived":
            return conversation.is_archived === true;
          case "email":
            return conversation.channel === "email" && !isSnoozedActive;
          case "facebook":
            return conversation.channel === "facebook" && !isSnoozedActive;
          case "instagram":
            return conversation.channel === "instagram" && !isSnoozedActive;
          case "whatsapp":
            return conversation.channel === "whatsapp" && !isSnoozedActive;
          default:
            if (selectedTab.startsWith('inbox-')) {
              const inboxId = selectedTab.replace('inbox-', '');
              return conversation.inbox_id === inboxId && !isSnoozedActive;
            }
            return !isSnoozedActive;
        }
      })();

      return matchesSearch && matchesStatus && matchesPriority && matchesInbox && matchesTab;
    })
    .sort((a, b) => {
      switch (state.sortBy) {
        case 'oldest':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          const aPriority = priorityOrder[a.priority] || 2;
          const bPriority = priorityOrder[b.priority] || 2;
          if (aPriority !== bPriority) return bPriority - aPriority;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'unread':
          if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'latest':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  // Bulk operations
  const bulkMarkAsRead = async () => {
    const ids = Array.from(state.selectedConversations);
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('conversations')
      .update({ is_read: true })
      .in('id', ids);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(`Marked ${ids.length} conversations as read`);
      dispatch({ type: 'CLEAR_BULK_SELECTION' });
    } else {
      toast.error('Failed to mark conversations as read');
    }
  };

  const bulkMarkAsUnread = async () => {
    const ids = Array.from(state.selectedConversations);
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('conversations')
      .update({ is_read: false })
      .in('id', ids);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(`Marked ${ids.length} conversations as unread`);
      dispatch({ type: 'CLEAR_BULK_SELECTION' });
    } else {
      toast.error('Failed to mark conversations as unread');
    }
  };

  const bulkChangeStatus = async (status: string) => {
    const ids = Array.from(state.selectedConversations);
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('conversations')
      .update({ status })
      .in('id', ids);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(`Changed status for ${ids.length} conversations`);
      dispatch({ type: 'CLEAR_BULK_SELECTION' });
    } else {
      toast.error('Failed to change status');
    }
  };

  const bulkArchive = async () => {
    const ids = Array.from(state.selectedConversations);
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('conversations')
      .update({ is_archived: true, status: 'closed' })
      .in('id', ids);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(`Archived ${ids.length} conversations`);
      dispatch({ type: 'CLEAR_BULK_SELECTION' });
    } else {
      toast.error('Failed to archive conversations');
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(state.selectedConversations);
    if (ids.length === 0) return;

    // First delete messages
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .in('conversation_id', ids);
    
    if (messagesError) {
      toast.error('Failed to delete conversations');
      return;
    }

    // Then delete conversations
    const { error: conversationsError } = await supabase
      .from('conversations')
      .delete()
      .in('id', ids);
    
    if (!conversationsError) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(`Deleted ${ids.length} conversations`);
      dispatch({ type: 'CLEAR_BULK_SELECTION' });
    } else {
      toast.error('Failed to delete conversations');
    }
  };

  const value = {
    state,
    dispatch,
    conversations,
    isLoading,
    hasSessionError,
    archiveConversation,
    deleteConversation,
    markAllAsRead,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    filteredConversations: filteredAndSortedConversations,
    bulkMarkAsRead,
    bulkMarkAsUnread,
    bulkChangeStatus,
    bulkArchive,
    bulkDelete,
  };

  return (
    <ConversationListContext.Provider value={value}>
      {children}
    </ConversationListContext.Provider>
  );
};

export const useConversationList = () => {
  const context = useContext(ConversationListContext);
  if (context === undefined) {
    throw new Error('useConversationList must be used within a ConversationListProvider');
  }
  return context;
};