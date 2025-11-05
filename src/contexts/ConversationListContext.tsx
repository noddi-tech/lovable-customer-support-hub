import { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';
import { groupConversationsByThread } from '@/lib/conversationThreading';

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
  thread_count?: number; // Number of conversations in this thread
  thread_ids?: string[]; // IDs of all conversations in thread
  is_thread_representative?: boolean; // True for the main/latest conversation in thread
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
  tableSort: { key: string; direction: 'asc' | 'desc' | null };
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
  | { type: 'TOGGLE_BULK_MODE' }
  | { type: 'SET_SORT'; payload: string };

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
  tableSort: { key: 'waiting', direction: 'desc' }, // Default: sort by waiting time descending
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
    case 'SET_SORT': {
      const currentKey = state.tableSort.key;
      const currentDirection = state.tableSort.direction;
      
      if (action.payload === currentKey) {
        // Toggle through: null -> asc -> desc -> null
        const newDirection = currentDirection === null ? 'asc' : currentDirection === 'asc' ? 'desc' : null;
        return { ...state, tableSort: { key: action.payload, direction: newDirection } };
      } else {
        // New column, start with ascending
        return { ...state, tableSort: { key: action.payload, direction: 'asc' } };
      }
    }
    default:
      return state;
  }
}

interface ConversationListContextType {
  state: ConversationListState;
  dispatch: React.Dispatch<ConversationListAction>;
  conversations: Conversation[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  totalCount: number;
  hasSessionError: boolean;
  archiveConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  markAllAsRead: () => void;
  isMarkingAllAsRead: boolean;
  toggleConversationRead: (id: string, currentReadState: boolean) => void;
  filteredConversations: Conversation[];
  bulkMarkAsRead: () => void;
  bulkMarkAsUnread: () => void;
  bulkChangeStatus: (status: string) => void;
  bulkArchive: () => void;
  bulkDelete: () => void;
  bulkAssign: (assigneeId: string) => void;
  agents: Array<{ id: string; name: string }>;
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

  // Fetch agents for assignment
  const { data: agentsData = [] } = useQuery({
    queryKey: ['agents', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      
      return (data || []).map((profile: any) => ({
        id: profile.user_id,
        name: profile.full_name,
      }));
    },
  });

  // Fetch conversations with infinite query for pagination
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading, 
    error 
  } = useInfiniteQuery({
    queryKey: ['conversations', user?.id, selectedInboxId, selectedTab],
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    gcTime: 10 * 60 * 1000,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      logger.info('Fetching conversations page', { 
        userId: user?.id, 
        offset: pageParam,
        inbox: selectedInboxId,
        status: selectedTab 
      }, 'ConversationListProvider');
      
      const statusFilter = selectedTab === 'all' ? null : selectedTab;
      
      const { data, error } = await supabase.rpc('get_conversations', {
        inbox_filter: (selectedInboxId && selectedInboxId !== 'all') ? selectedInboxId : null,
        status_filter: statusFilter,
        page_limit: 50,
        page_offset: pageParam
      });

      if (error) {
        logger.error('Error fetching conversations', error, 'ConversationListProvider');
        if (error?.code === 'PGRST301' || 
            error?.message?.includes('JWT expired') ||
            error?.message?.includes('auth.uid() is null') ||
            error?.code === 'PGRST116') {
          throw new Error('SESSION_ERROR');
        }
        throw error;
      }
      
      const conversations = (data || []).map((conv: any) => ({
        ...conv,
        customer: conv.customer as Customer,
        assigned_to: conv.assigned_to as AssignedTo,
      })) as Conversation[];
      
      const totalCount = (data as any)?.[0]?.total_count || 0;
      
      logger.info('Conversations page fetched', { 
        count: conversations.length,
        totalCount,
        hasMore: pageParam + 50 < totalCount
      }, 'ConversationListProvider');
      
      return {
        conversations,
        totalCount,
        nextOffset: pageParam + 50
      };
    },
    getNextPageParam: (lastPage) => {
      const loadedCount = lastPage.nextOffset;
      return loadedCount < lastPage.totalCount ? lastPage.nextOffset : undefined;
    },
    retry: (failureCount, error: any) => {
      if (error?.message === 'SESSION_ERROR') {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Flatten paginated data and apply threading
  const conversations = useMemo(() => {
    const flattened = data?.pages.flatMap(page => page.conversations) || [];
    
    // Apply conversation threading to group related conversations
    // This groups conversations from the same customer with the same subject
    const threaded = groupConversationsByThread(flattened);
    
    logger.debug('Conversation threading applied', {
      original: flattened.length,
      afterThreading: threaded.length,
      reduced: flattened.length - threaded.length
    }, 'ConversationListProvider');
    
    return threaded;
  }, [data]);
  
  const totalCount = data?.pages[0]?.totalCount || 0;

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

  // Toggle individual conversation read/unread status
  const toggleConversationReadMutation = useMutation({
    mutationFn: async ({ id, currentReadState }: { id: string; currentReadState: boolean }) => {
      const { error } = await supabase
        .from('conversations')
        .update({ is_read: !currentReadState })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      toast.success(variables.currentReadState ? 'Marked as unread' : 'Marked as read');
    },
    onError: (error) => {
      logger.error('Error toggling conversation read status', error, 'ConversationListProvider');
      toast.error('Failed to update conversation');
    }
  });

  const toggleConversationRead = (id: string, currentReadState: boolean) => {
    toggleConversationReadMutation.mutate({ id, currentReadState });
  };

  // Filter and sort conversations
  const effectiveInboxId = selectedTab.startsWith('inbox-')
    ? selectedTab.replace('inbox-', '')
    : (selectedInboxId !== 'all' ? selectedInboxId : null);

  const filteredAndSortedConversations = useMemo(() => {
    const filtered = conversations.filter((conversation) => {
      const matchesSearch = 
        (conversation.subject || '').toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        (conversation.customer?.full_name || '').toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        (conversation.customer?.email || '').toLowerCase().includes(state.searchQuery.toLowerCase());
      
      // CRITICAL FIX: Don't apply state.statusFilter when selectedTab is handling status filtering
      // This prevents duplicate filtering that was hiding conversations
      const isTabHandlingStatus = selectedTab !== 'all' && ['unread', 'assigned', 'pending', 'closed', 'archived', 'snoozed'].includes(selectedTab);
      const matchesStatus = isTabHandlingStatus || state.statusFilter === "all" || conversation.status === state.statusFilter;
      
      const matchesPriority = state.priorityFilter === "all" || conversation.priority === state.priorityFilter;
      const matchesInbox = !effectiveInboxId || conversation.inbox_id === effectiveInboxId;
      
      const matchesTab = (() => {
        const isSnoozedActive = !!conversation.snooze_until && new Date(conversation.snooze_until) > new Date();
        
        // When viewing a specific inbox directly (not "all"), show ALL conversations in that inbox
        // regardless of status, unless a specific status tab is selected
        const isViewingSpecificInbox = selectedInboxId && selectedInboxId !== 'all';
        
        switch (selectedTab) {
          case "snoozed":
            return isSnoozedActive;
          case "all":
            // If viewing a specific inbox, show ALL conversations (including closed)
            // Otherwise, filter out closed conversations from the "All Messages" view
            if (isViewingSpecificInbox) {
              return !isSnoozedActive;
            }
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

    // Apply table sorting if a column is sorted
    if (state.tableSort.direction) {
      return filtered.sort((a, b) => {
        const multiplier = state.tableSort.direction === 'asc' ? 1 : -1;
        
        switch (state.tableSort.key) {
          case 'customer':
            return multiplier * ((a.customer?.full_name || '').localeCompare(b.customer?.full_name || ''));
          case 'subject':
            return multiplier * ((a.subject || '').localeCompare(b.subject || ''));
          case 'channel':
            return multiplier * a.channel.localeCompare(b.channel);
          case 'waiting':
            return multiplier * (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
          case 'sla':
            const slaOrder = { breached: 4, at_risk: 3, on_track: 2, met: 1 };
            const aSla = slaOrder[a.slaStatus || 'on_track'] || 2;
            const bSla = slaOrder[b.slaStatus || 'on_track'] || 2;
            return multiplier * (aSla - bSla);
          case 'status':
            const statusOrder = { open: 1, pending: 2, resolved: 3, closed: 4 };
            const aStatus = statusOrder[a.status] || 1;
            const bStatus = statusOrder[b.status] || 1;
            return multiplier * (aStatus - bStatus);
          case 'priority':
            const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
            const aPriority = priorityOrder[a.priority] || 2;
            const bPriority = priorityOrder[b.priority] || 2;
            return multiplier * (aPriority - bPriority);
          default:
            return 0;
        }
      });
    }

    // Otherwise use legacy sortBy
    return filtered.sort((a, b) => {
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
  }, [conversations, state.searchQuery, state.statusFilter, state.priorityFilter, state.sortBy, state.tableSort, selectedTab, selectedInboxId, effectiveInboxId]);

  // Comprehensive debug logging
  logger.debug('Filter state', {
    totalConversations: conversations.length,
    totalForInbox: effectiveInboxId ? conversations.filter(c => c.inbox_id === effectiveInboxId).length : 0,
    filteredCount: filteredAndSortedConversations.length,
    selectedTab,
    selectedInboxId,
    effectiveInboxId,
    filters: {
      searchQuery: state.searchQuery,
      statusFilter: state.statusFilter,
      priorityFilter: state.priorityFilter,
    }
  }, 'ConversationListFilter');


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

  const bulkAssign = async (assigneeId: string) => {
    const ids = Array.from(state.selectedConversations);
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('conversations')
      .update({ assigned_to_id: assigneeId })
      .in('id', ids);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      const agent = agentsData.find(a => a.id === assigneeId);
      toast.success(`Assigned ${ids.length} conversations to ${agent?.name || 'agent'}`);
      dispatch({ type: 'CLEAR_BULK_SELECTION' });
    } else {
      toast.error('Failed to assign conversations');
    }
  };

  const value = {
    state,
    dispatch,
    conversations,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage || false,
    fetchNextPage: () => fetchNextPage(),
    totalCount,
    hasSessionError,
    archiveConversation,
    deleteConversation,
    markAllAsRead,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    toggleConversationRead,
    filteredConversations: filteredAndSortedConversations,
    bulkMarkAsRead,
    bulkMarkAsUnread,
    bulkChangeStatus,
    bulkArchive,
    bulkDelete,
    bulkAssign,
    agents: agentsData,
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