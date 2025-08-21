import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

interface SidebarState {
  selectedTab: string;
  selectedInboxId?: string;
  expandedSections: Record<string, boolean>;
  collapsedMode: boolean;
  lastVisited: Record<string, number>;
  prefetchQueue: Set<string>;
}

type SidebarAction = 
  | { type: 'SET_SELECTED_TAB'; payload: string }
  | { type: 'SET_SELECTED_INBOX'; payload?: string }
  | { type: 'TOGGLE_SECTION'; payload: string }
  | { type: 'SET_COLLAPSED_MODE'; payload: boolean }
  | { type: 'UPDATE_LAST_VISITED'; payload: { tab: string; timestamp: number } }
  | { type: 'ADD_TO_PREFETCH_QUEUE'; payload: string }
  | { type: 'REMOVE_FROM_PREFETCH_QUEUE'; payload: string }
  | { type: 'RESET_STATE' };

const sidebarStateReducer = (state: SidebarState, action: SidebarAction): SidebarState => {
  switch (action.type) {
    case 'SET_SELECTED_TAB':
      return {
        ...state,
        selectedTab: action.payload,
        lastVisited: {
          ...state.lastVisited,
          [action.payload]: Date.now()
        }
      };
    
    case 'SET_SELECTED_INBOX':
      return {
        ...state,
        selectedInboxId: action.payload
      };
    
    case 'TOGGLE_SECTION':
      return {
        ...state,
        expandedSections: {
          ...state.expandedSections,
          [action.payload]: !state.expandedSections[action.payload]
        }
      };
    
    case 'SET_COLLAPSED_MODE':
      return {
        ...state,
        collapsedMode: action.payload
      };
    
    case 'UPDATE_LAST_VISITED':
      return {
        ...state,
        lastVisited: {
          ...state.lastVisited,
          [action.payload.tab]: action.payload.timestamp
        }
      };
    
    case 'ADD_TO_PREFETCH_QUEUE':
      return {
        ...state,
        prefetchQueue: new Set([...state.prefetchQueue, action.payload])
      };
    
    case 'REMOVE_FROM_PREFETCH_QUEUE':
      const newQueue = new Set(state.prefetchQueue);
      newQueue.delete(action.payload);
      return {
        ...state,
        prefetchQueue: newQueue
      };
    
    case 'RESET_STATE':
      return {
        selectedTab: 'all',
        selectedInboxId: undefined,
        expandedSections: {
          inbox: true,
          notifications: true,
          channels: true,
          inboxes: true
        },
        collapsedMode: false,
        lastVisited: {},
        prefetchQueue: new Set()
      };
    
    default:
      return state;
  }
};

interface SidebarStateContextType {
  state: SidebarState;
  dispatch: React.Dispatch<SidebarAction>;
  actions: {
    setSelectedTab: (tab: string) => void;
    setSelectedInbox: (inboxId?: string) => void;
    toggleSection: (sectionId: string) => void;
    setCollapsedMode: (collapsed: boolean) => void;
    updateLastVisited: (tab: string) => void;
    addToPrefetchQueue: (item: string) => void;
    removeFromPrefetchQueue: (item: string) => void;
    resetState: () => void;
  };
}

const SidebarStateContext = createContext<SidebarStateContextType | undefined>(undefined);

interface SidebarStateManagerProps {
  children: ReactNode;
  initialTab?: string;
  initialInboxId?: string;
}

export const SidebarStateManager: React.FC<SidebarStateManagerProps> = ({
  children,
  initialTab = 'all',
  initialInboxId
}) => {
  const [state, dispatch] = useReducer(sidebarStateReducer, {
    selectedTab: initialTab,
    selectedInboxId: initialInboxId,
    expandedSections: {
      inbox: true,
      notifications: true,
      channels: true,
      inboxes: true
    },
    collapsedMode: false,
    lastVisited: {},
    prefetchQueue: new Set<string>()
  });

  // Action creators
  const actions = {
    setSelectedTab: useCallback((tab: string) => {
      dispatch({ type: 'SET_SELECTED_TAB', payload: tab });
    }, [dispatch]),

    setSelectedInbox: useCallback((inboxId?: string) => {
      dispatch({ type: 'SET_SELECTED_INBOX', payload: inboxId });
    }, [dispatch]),

    toggleSection: useCallback((sectionId: string) => {
      dispatch({ type: 'TOGGLE_SECTION', payload: sectionId });
    }, [dispatch]),

    setCollapsedMode: useCallback((collapsed: boolean) => {
      dispatch({ type: 'SET_COLLAPSED_MODE', payload: collapsed });
    }, [dispatch]),

    updateLastVisited: useCallback((tab: string) => {
      dispatch({ 
        type: 'UPDATE_LAST_VISITED', 
        payload: { tab, timestamp: Date.now() } 
      });
    }, [dispatch]),

    addToPrefetchQueue: useCallback((item: string) => {
      dispatch({ type: 'ADD_TO_PREFETCH_QUEUE', payload: item });
    }, [dispatch]),

    removeFromPrefetchQueue: useCallback((item: string) => {
      dispatch({ type: 'REMOVE_FROM_PREFETCH_QUEUE', payload: item });
    }, [dispatch]),

    resetState: useCallback(() => {
      dispatch({ type: 'RESET_STATE' });
    }, [dispatch])
  };

  const value: SidebarStateContextType = {
    state,
    dispatch,
    actions
  };

  return (
    <SidebarStateContext.Provider value={value}>
      {children}
    </SidebarStateContext.Provider>
  );
};

export const useSidebarState = (): SidebarStateContextType => {
  const context = useContext(SidebarStateContext);
  if (context === undefined) {
    throw new Error('useSidebarState must be used within a SidebarStateManager');
  }
  return context;
};