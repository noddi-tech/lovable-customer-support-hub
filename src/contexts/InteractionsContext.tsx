import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types for conversation management
export type ConversationStatus = "open" | "pending" | "resolved" | "closed";
export type ConversationPriority = "low" | "normal" | "high" | "urgent";
export type ConversationChannel = "email" | "chat" | "social" | "facebook" | "instagram" | "whatsapp";

export interface Customer {
  id: string;
  full_name: string;
  email: string;
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
  assigned_to?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

// Filters and state
export interface InteractionsFilters {
  status: ConversationStatus[];
  priority: ConversationPriority[];
  channel: ConversationChannel[];
  assigned: boolean | null;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

export interface InteractionsState {
  selectedConversationId: string | null;
  selectedSection: string;
  filters: InteractionsFilters;
  viewMode: 'list' | 'grid';
  searchQuery: string;
}

// Actions
export type InteractionsAction =
  | { type: 'SELECT_CONVERSATION'; payload: string | null }
  | { type: 'SELECT_SECTION'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<InteractionsFilters> }
  | { type: 'SET_VIEW_MODE'; payload: 'list' | 'grid' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'RESET_FILTERS' };

// Initial state
const initialState: InteractionsState = {
  selectedConversationId: null,
  selectedSection: 'inbox',
  filters: {
    status: [],
    priority: [],
    channel: [],
    assigned: null,
    dateRange: {
      start: null,
      end: null
    }
  },
  viewMode: 'list',
  searchQuery: ''
};

// Reducer
const interactionsReducer = (state: InteractionsState, action: InteractionsAction): InteractionsState => {
  switch (action.type) {
    case 'SELECT_CONVERSATION':
      return {
        ...state,
        selectedConversationId: action.payload
      };
    case 'SELECT_SECTION':
      return {
        ...state,
        selectedSection: action.payload,
        selectedConversationId: null // Reset conversation when changing sections
      };
    case 'SET_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        }
      };
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload
      };
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload
      };
    case 'RESET_FILTERS':
      return {
        ...state,
        filters: initialState.filters,
        searchQuery: ''
      };
    default:
      return state;
  }
};

// Context
interface InteractionsContextValue {
  state: InteractionsState;
  selectConversation: (conversationId: string | null) => void;
  selectSection: (section: string) => void;
  setFilters: (filters: Partial<InteractionsFilters>) => void;
  setViewMode: (viewMode: 'list' | 'grid') => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

const InteractionsContext = createContext<InteractionsContextValue | undefined>(undefined);

export const useInteractions = () => {
  const context = useContext(InteractionsContext);
  if (!context) {
    throw new Error('useInteractions must be used within an InteractionsProvider');
  }
  return context;
};

// Provider
interface InteractionsProviderProps {
  children: ReactNode;
}

export const InteractionsProvider: React.FC<InteractionsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(interactionsReducer, initialState);

  const selectConversation = (conversationId: string | null) => {
    dispatch({ type: 'SELECT_CONVERSATION', payload: conversationId });
  };

  const selectSection = (section: string) => {
    dispatch({ type: 'SELECT_SECTION', payload: section });
  };

  const setFilters = (filters: Partial<InteractionsFilters>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  const setViewMode = (viewMode: 'list' | 'grid') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: viewMode });
  };

  const setSearchQuery = (query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  };

  const resetFilters = () => {
    dispatch({ type: 'RESET_FILTERS' });
  };

  return (
    <InteractionsContext.Provider
      value={{
        state,
        selectConversation,
        selectSection,
        setFilters,
        setViewMode,
        setSearchQuery,
        resetFilters
      }}
    >
      {children}
    </InteractionsContext.Provider>
  );
};