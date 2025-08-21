import { createContext, useContext, useReducer, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

export type ConversationStatus = "open" | "pending" | "resolved" | "closed";
export type ConversationPriority = "low" | "normal" | "high" | "urgent";
export type ConversationChannel = "email" | "chat" | "social" | "facebook" | "instagram" | "whatsapp";

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
}

interface ConversationListState {
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  deleteDialogOpen: boolean;
  conversationToDelete: string | null;
}

type ConversationListAction =
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: string }
  | { type: 'SET_PRIORITY_FILTER'; payload: string }
  | { type: 'OPEN_DELETE_DIALOG'; payload: string }
  | { type: 'CLOSE_DELETE_DIALOG' };

const initialState: ConversationListState = {
  searchQuery: '',
  statusFilter: 'all',
  priorityFilter: 'all',
  deleteDialogOpen: false,
  conversationToDelete: null,
};

function conversationListReducer(state: ConversationListState, action: ConversationListAction): ConversationListState {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
    case 'SET_PRIORITY_FILTER':
      return { ...state, priorityFilter: action.payload };
    case 'OPEN_DELETE_DIALOG':
      return { ...state, deleteDialogOpen: true, conversationToDelete: action.payload };
    case 'CLOSE_DELETE_DIALOG':
      return { ...state, deleteDialogOpen: false, conversationToDelete: null };
    default:
      return state;
  }
}

interface ConversationListContextType {
  state: ConversationListState;
  dispatch: React.Dispatch<ConversationListAction>;
  conversations: Conversation[];
  isLoading: boolean;
  archiveConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  filteredConversations: Conversation[];
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

  // Fetch conversations
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    enabled: !!user,
    queryFn: async () => {
      logger.info('Fetching conversations for user', { userId: user?.id }, 'ConversationListProvider');
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          customer:customers(id, full_name, email),
          assigned_to:profiles(id, full_name, avatar_url),
          email_account:email_accounts(id, email_address),
          messages(content, created_at)
        `)
        .in('channel', ['email', 'facebook', 'instagram', 'whatsapp'])
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      // Add preview text from the latest message
      const conversationsWithPreview = data?.map(conv => {
        const latestMessage = conv.messages?.[0];
        const previewText = latestMessage?.content 
          ? latestMessage.content.substring(0, 100).replace(/\n/g, ' ') + (latestMessage.content.length > 100 ? '...' : '')
          : '';
        
        return {
          ...conv,
          preview_text: previewText,
          messages: undefined // Remove messages from final object to keep it clean
        };
      }) || [];

      if (error) {
        logger.error('Error fetching conversations', error, 'ConversationListProvider');
        return [];
      }
      
      logger.info('Conversations fetched successfully', { count: conversationsWithPreview?.length }, 'ConversationListProvider');
      return conversationsWithPreview as Conversation[];
    },
  });

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

  const archiveConversation = (id: string) => {
    archiveConversationMutation.mutate(id);
  };

  const deleteConversation = (id: string) => {
    if (state.conversationToDelete) {
      deleteConversationMutation.mutate(state.conversationToDelete);
    }
  };

  // Filter conversations based on current filters
  const effectiveInboxId = selectedTab.startsWith('inbox-')
    ? selectedTab.replace('inbox-', '')
    : (selectedInboxId !== 'all' ? selectedInboxId : null);

  const filteredConversations = conversations.filter((conversation) => {
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

  const value = {
    state,
    dispatch,
    conversations,
    isLoading,
    archiveConversation,
    deleteConversation,
    filteredConversations,
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