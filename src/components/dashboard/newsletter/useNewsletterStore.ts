import { create } from 'zustand';
import { NewsletterBlock } from '../NewsletterBuilder';

interface GlobalStyles {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: string;
  backgroundColor: string;
  maxWidth: string;
}

interface NewsletterState {
  blocks: NewsletterBlock[];
  selectedBlockId: string | null;
  globalStyles: GlobalStyles;
  history: NewsletterBlock[][];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

interface NewsletterActions {
  addBlock: (blockType: NewsletterBlock['type']) => void;
  updateBlock: (id: string, updates: Partial<NewsletterBlock>) => void;
  deleteBlock: (id: string) => void;
  selectBlock: (id: string | null) => void;
  reorderBlocks: (fromIndex: number, toIndex: number) => void;
  updateGlobalStyles: (styles: Partial<GlobalStyles>) => void;
  clearNewsletter: () => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
}

const defaultGlobalStyles: GlobalStyles = {
  primaryColor: '#007aff',
  secondaryColor: '#5856d6',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '16px',
  backgroundColor: '#ffffff',
  maxWidth: '600px'
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const createDefaultBlock = (type: NewsletterBlock['type']): NewsletterBlock => {
  const baseBlock = {
    id: generateId(),
    type,
    styles: {
      margin: '0',
      padding: '16px',
      textAlign: 'left',
    }
  };

  switch (type) {
    case 'text':
      return {
        ...baseBlock,
        content: {
          text: 'Enter your text here...',
          tag: 'p'
        },
        styles: {
          ...baseBlock.styles,
          fontSize: '16px',
          color: '#333333',
          lineHeight: '1.6'
        }
      };
    
    case 'image':
      return {
        ...baseBlock,
        content: {
          src: '',
          alt: 'Image description',
          width: '100%',
          height: 'auto'
        },
        styles: {
          ...baseBlock.styles,
          textAlign: 'center'
        }
      };

    case 'button':
      return {
        ...baseBlock,
        content: {
          text: 'Click Here',
          href: '#',
          target: '_blank'
        },
        styles: {
          ...baseBlock.styles,
          backgroundColor: '#007aff',
          color: '#ffffff',
          borderRadius: '6px',
          padding: '12px 24px',
          textDecoration: 'none',
          display: 'inline-block',
          textAlign: 'center'
        }
      };

    case 'divider':
      return {
        ...baseBlock,
        content: {},
        styles: {
          ...baseBlock.styles,
          borderTop: '1px solid #e5e5e5',
          margin: '24px 0',
          padding: '0'
        }
      };

    case 'spacer':
      return {
        ...baseBlock,
        content: {
          height: '24px'
        },
        styles: {
          ...baseBlock.styles,
          padding: '0'
        }
      };

    case 'columns':
      return {
        ...baseBlock,
        content: {
          columns: [
            { content: 'Column 1 content', width: '50%' },
            { content: 'Column 2 content', width: '50%' }
          ]
        },
        styles: {
          ...baseBlock.styles,
          display: 'flex',
          gap: '16px'
        }
      };

    case 'social':
      return {
        ...baseBlock,
        content: {
          links: [
            { platform: 'facebook', url: '#', icon: 'facebook' },
            { platform: 'twitter', url: '#', icon: 'twitter' },
            { platform: 'linkedin', url: '#', icon: 'linkedin' }
          ]
        },
        styles: {
          ...baseBlock.styles,
          textAlign: 'center'
        }
      };

    case 'product':
      return {
        ...baseBlock,
        content: {
          title: 'Product Name',
          description: 'Product description goes here...',
          price: '$99.99',
          image: '',
          buttonText: 'Buy Now',
          buttonLink: '#'
        }
      };

    case 'ticket':
      return {
        ...baseBlock,
        content: {
          title: 'Service Ticket Summary',
          tickets: []
        }
      };

    case 'html':
      return {
        ...baseBlock,
        content: {
          html: '<p>Custom HTML content</p>'
        }
      };

    default:
      return {
        ...baseBlock,
        content: {}
      };
  }
};

export const useNewsletterStore = create<NewsletterState & NewsletterActions>((set, get) => ({
  // State
  blocks: [],
  selectedBlockId: null,
  globalStyles: defaultGlobalStyles,
  history: [[]],
  historyIndex: 0,
  canUndo: false,
  canRedo: false,

  // Actions
  addBlock: (blockType) => {
    const newBlock = createDefaultBlock(blockType);
    set((state) => {
      const newBlocks = [...state.blocks, newBlock];
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newBlocks);
      
      return {
        blocks: newBlocks,
        selectedBlockId: newBlock.id,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        canUndo: newHistory.length > 1,
        canRedo: false
      };
    });
  },

  updateBlock: (id, updates) => {
    set((state) => {
      const updatedBlocks = state.blocks.map(block =>
        block.id === id ? { ...block, ...updates } : block
      );
      
      return {
        blocks: updatedBlocks
      };
    });
  },

  deleteBlock: (id) => {
    set((state) => {
      const newBlocks = state.blocks.filter(block => block.id !== id);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newBlocks);
      
      return {
        blocks: newBlocks,
        selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        canUndo: newHistory.length > 1,
        canRedo: false
      };
    });
  },

  selectBlock: (id) => {
    set({ selectedBlockId: id });
  },

  reorderBlocks: (fromIndex, toIndex) => {
    set((state) => {
      const newBlocks = [...state.blocks];
      const [removed] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, removed);
      
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newBlocks);
      
      return {
        blocks: newBlocks,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        canUndo: newHistory.length > 1,
        canRedo: false
      };
    });
  },

  updateGlobalStyles: (styles) => {
    set((state) => ({
      globalStyles: { ...state.globalStyles, ...styles }
    }));
  },

  clearNewsletter: () => {
    set({
      blocks: [],
      selectedBlockId: null,
      globalStyles: defaultGlobalStyles,
      history: [[]],
      historyIndex: 0,
      canUndo: false,
      canRedo: false
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          blocks: state.history[newIndex],
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: true,
          selectedBlockId: null
        };
      }
      return state;
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          blocks: state.history[newIndex],
          historyIndex: newIndex,
          canUndo: true,
          canRedo: newIndex < state.history.length - 1,
          selectedBlockId: null
        };
      }
      return state;
    });
  },

  saveToHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push([...state.blocks]);
      
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
        canUndo: newHistory.length > 1,
        canRedo: false
      };
    });
  }
}));