import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface VoiceFilters {
  status?: string;
  direction?: 'inbound' | 'outbound';
  dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all';
  searchQuery?: string;
  assignedAgent?: string;
}

export interface VoiceListState {
  selectedCallId: string | null;
  selectedSection: string;
  filters: VoiceFilters;
  isListCollapsed: boolean;
  showCallDetails: boolean;
  viewMode: 'list' | 'grid';
}

export type VoiceListAction =
  | { type: 'SELECT_CALL'; payload: string | null }
  | { type: 'SELECT_SECTION'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<VoiceFilters> }
  | { type: 'TOGGLE_LIST'; payload?: boolean }
  | { type: 'TOGGLE_CALL_DETAILS'; payload?: boolean }
  | { type: 'SET_VIEW_MODE'; payload: 'list' | 'grid' }
  | { type: 'RESET_FILTERS' };

const initialState: VoiceListState = {
  selectedCallId: null,
  selectedSection: 'ongoing-calls',
  filters: {
    dateRange: 'today'
  },
  isListCollapsed: false,
  showCallDetails: false,
  viewMode: 'list'
};

const voiceListReducer = (state: VoiceListState, action: VoiceListAction): VoiceListState => {
  switch (action.type) {
    case 'SELECT_CALL':
      return {
        ...state,
        selectedCallId: action.payload,
        showCallDetails: !!action.payload
      };
    case 'SELECT_SECTION':
      return {
        ...state,
        selectedSection: action.payload,
        selectedCallId: null,
        showCallDetails: false
      };
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };
    case 'TOGGLE_LIST':
      return {
        ...state,
        isListCollapsed: action.payload ?? !state.isListCollapsed
      };
    case 'TOGGLE_CALL_DETAILS':
      return {
        ...state,
        showCallDetails: action.payload ?? !state.showCallDetails
      };
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload
      };
    case 'RESET_FILTERS':
      return {
        ...state,
        filters: { dateRange: 'today' }
      };
    default:
      return state;
  }
};

interface VoiceContextValue {
  state: VoiceListState;
  dispatch: React.Dispatch<VoiceListAction>;
  
  // Helper functions
  selectCall: (callId: string | null) => void;
  selectSection: (section: string) => void;
  setFilters: (filters: Partial<VoiceFilters>) => void;
  toggleList: (collapsed?: boolean) => void;
  toggleCallDetails: (show?: boolean) => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  resetFilters: () => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};

interface VoiceProviderProps {
  children: ReactNode;
}

export const VoiceProvider: React.FC<VoiceProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(voiceListReducer, initialState);

  const value: VoiceContextValue = {
    state,
    dispatch,
    
    selectCall: (callId) => dispatch({ type: 'SELECT_CALL', payload: callId }),
    selectSection: (section) => dispatch({ type: 'SELECT_SECTION', payload: section }),
    setFilters: (filters) => dispatch({ type: 'SET_FILTERS', payload: filters }),
    toggleList: (collapsed) => dispatch({ type: 'TOGGLE_LIST', payload: collapsed }),
    toggleCallDetails: (show) => dispatch({ type: 'TOGGLE_CALL_DETAILS', payload: show }),
    setViewMode: (mode) => dispatch({ type: 'SET_VIEW_MODE', payload: mode }),
    resetFilters: () => dispatch({ type: 'RESET_FILTERS' })
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};