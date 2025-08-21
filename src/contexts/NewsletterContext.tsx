import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';

// Types
export interface Newsletter {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'paused';
  created_at: string;
  updated_at: string;
  scheduled_for?: string;
  sent_at?: string;
  blocks: any[];
  global_styles: any;
  analytics?: {
    sent_count?: number;
    open_rate?: number;
    click_rate?: number;
  };
  tags?: string[];
  template?: boolean;
}

export interface NewsletterFilters {
  status?: 'all' | 'draft' | 'scheduled' | 'sent' | 'templates';
  searchQuery?: string;
  dateRange?: 'today' | 'week' | 'month' | 'all';
  tags?: string[];
}

export interface NewsletterListState {
  newsletters: Newsletter[];
  selectedNewsletterId: string | null;
  filters: NewsletterFilters;
  isListCollapsed: boolean;
  showNewsletterDetails: boolean;
  viewMode: 'list' | 'grid';
  isLoading: boolean;
  error: string | null;
}

export type NewsletterListAction =
  | { type: 'SET_NEWSLETTERS'; payload: Newsletter[] }
  | { type: 'ADD_NEWSLETTER'; payload: Newsletter }
  | { type: 'UPDATE_NEWSLETTER'; payload: { id: string; updates: Partial<Newsletter> } }
  | { type: 'DELETE_NEWSLETTER'; payload: string }
  | { type: 'SELECT_NEWSLETTER'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<NewsletterFilters> }
  | { type: 'TOGGLE_LIST'; payload?: boolean }
  | { type: 'TOGGLE_NEWSLETTER_DETAILS'; payload?: boolean }
  | { type: 'SET_VIEW_MODE'; payload: 'list' | 'grid' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_FILTERS' };

const initialState: NewsletterListState = {
  newsletters: [],
  selectedNewsletterId: null,
  filters: {
    status: 'all',
    dateRange: 'all'
  },
  isListCollapsed: false,
  showNewsletterDetails: false,
  viewMode: 'list',
  isLoading: false,
  error: null
};

// Mock data for demonstration
const mockNewsletters: Newsletter[] = [
  {
    id: '1',
    title: 'Welcome to Our Newsletter',
    description: 'A warm welcome message for new subscribers',
    status: 'sent',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T14:30:00Z',
    sent_at: '2024-01-16T09:00:00Z',
    blocks: [],
    global_styles: {},
    analytics: {
      sent_count: 1250,
      open_rate: 68,
      click_rate: 15
    },
    tags: ['welcome', 'onboarding']
  },
  {
    id: '2',
    title: 'Monthly Product Updates',
    description: 'Latest features and improvements from our team',
    status: 'scheduled',
    created_at: '2024-01-20T11:00:00Z',
    updated_at: '2024-01-22T16:45:00Z',
    scheduled_for: '2024-01-30T10:00:00Z',
    blocks: [],
    global_styles: {},
    tags: ['updates', 'features']
  },
  {
    id: '3',
    title: 'Holiday Special Offers',
    description: 'Exclusive deals for our valued customers',
    status: 'draft',
    created_at: '2024-01-18T09:30:00Z',
    updated_at: '2024-01-21T13:20:00Z',
    blocks: [],
    global_styles: {},
    tags: ['promotion', 'holiday']
  },
  {
    id: '4',
    title: 'Newsletter Template - Modern',
    description: 'A clean, modern template for professional newsletters',
    status: 'draft',
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-10T12:00:00Z',
    blocks: [],
    global_styles: {},
    template: true,
    tags: ['template', 'modern']
  }
];

const newsletterListReducer = (state: NewsletterListState, action: NewsletterListAction): NewsletterListState => {
  switch (action.type) {
    case 'SET_NEWSLETTERS':
      return {
        ...state,
        newsletters: action.payload,
        isLoading: false,
        error: null
      };
    case 'ADD_NEWSLETTER':
      return {
        ...state,
        newsletters: [action.payload, ...state.newsletters]
      };
    case 'UPDATE_NEWSLETTER':
      return {
        ...state,
        newsletters: state.newsletters.map(newsletter =>
          newsletter.id === action.payload.id 
            ? { ...newsletter, ...action.payload.updates, updated_at: new Date().toISOString() }
            : newsletter
        )
      };
    case 'DELETE_NEWSLETTER':
      return {
        ...state,
        newsletters: state.newsletters.filter(n => n.id !== action.payload),
        selectedNewsletterId: state.selectedNewsletterId === action.payload ? null : state.selectedNewsletterId
      };
    case 'SELECT_NEWSLETTER':
      return {
        ...state,
        selectedNewsletterId: action.payload,
        showNewsletterDetails: !!action.payload
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
    case 'TOGGLE_NEWSLETTER_DETAILS':
      return {
        ...state,
        showNewsletterDetails: action.payload ?? !state.showNewsletterDetails
      };
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    case 'RESET_FILTERS':
      return {
        ...state,
        filters: { status: 'all', dateRange: 'all' }
      };
    default:
      return state;
  }
};

interface NewsletterContextValue {
  state: NewsletterListState;
  dispatch: React.Dispatch<NewsletterListAction>;
  
  // Helper functions
  selectNewsletter: (id: string | null) => void;
  setFilters: (filters: Partial<NewsletterFilters>) => void;
  toggleList: (collapsed?: boolean) => void;
  toggleNewsletterDetails: (show?: boolean) => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  resetFilters: () => void;
  
  // CRUD operations
  createNewsletter: (newsletter: Omit<Newsletter, 'id' | 'created_at' | 'updated_at'>) => void;
  updateNewsletter: (id: string, updates: Partial<Newsletter>) => void;
  deleteNewsletter: (id: string) => void;
  duplicateNewsletter: (id: string) => void;
}

const NewsletterContext = createContext<NewsletterContextValue | null>(null);

export const useNewsletter = () => {
  const context = useContext(NewsletterContext);
  if (!context) {
    throw new Error('useNewsletter must be used within a NewsletterProvider');
  }
  return context;
};

interface NewsletterProviderProps {
  children: ReactNode;
}

export const NewsletterProvider: React.FC<NewsletterProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(newsletterListReducer, {
    ...initialState,
    newsletters: mockNewsletters
  });

  // Simulate loading mock data
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const timer = setTimeout(() => {
      dispatch({ type: 'SET_NEWSLETTERS', payload: mockNewsletters });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const value: NewsletterContextValue = {
    state,
    dispatch,
    
    selectNewsletter: (id) => dispatch({ type: 'SELECT_NEWSLETTER', payload: id }),
    setFilters: (filters) => dispatch({ type: 'SET_FILTERS', payload: filters }),
    toggleList: (collapsed) => dispatch({ type: 'TOGGLE_LIST', payload: collapsed }),
    toggleNewsletterDetails: (show) => dispatch({ type: 'TOGGLE_NEWSLETTER_DETAILS', payload: show }),
    setViewMode: (mode) => dispatch({ type: 'SET_VIEW_MODE', payload: mode }),
    resetFilters: () => dispatch({ type: 'RESET_FILTERS' }),
    
    createNewsletter: (newsletterData) => {
      const newsletter: Newsletter = {
        ...newsletterData,
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dispatch({ type: 'ADD_NEWSLETTER', payload: newsletter });
    },
    
    updateNewsletter: (id, updates) => {
      dispatch({ type: 'UPDATE_NEWSLETTER', payload: { id, updates } });
    },
    
    deleteNewsletter: (id) => {
      dispatch({ type: 'DELETE_NEWSLETTER', payload: id });
    },
    
    duplicateNewsletter: (id) => {
      const newsletter = state.newsletters.find(n => n.id === id);
      if (newsletter) {
        const duplicated: Newsletter = {
          ...newsletter,
          id: generateId(),
          title: `${newsletter.title} (Copy)`,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          scheduled_for: undefined,
          sent_at: undefined
        };
        dispatch({ type: 'ADD_NEWSLETTER', payload: duplicated });
      }
    }
  };

  return (
    <NewsletterContext.Provider value={value}>
      {children}
    </NewsletterContext.Provider>
  );
};