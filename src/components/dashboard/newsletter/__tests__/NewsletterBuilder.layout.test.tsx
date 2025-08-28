import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import NewsletterBuilder from '../../NewsletterBuilder';

// Mock all the child components and hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

vi.mock('../useNewsletterStore', () => ({
  useNewsletterStore: () => ({
    blocks: [],
    selectedBlockId: null,
    globalStyles: {},
    canUndo: false,
    canRedo: false,
    addBlock: vi.fn(),
    selectBlock: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    clearNewsletter: vi.fn()
  })
}));

vi.mock('../NewsletterCanvas', () => ({
  NewsletterCanvas: () => <div data-testid="newsletter-canvas">Canvas</div>
}));

vi.mock('../BlocksPalette', () => ({
  BlocksPalette: () => <div data-testid="blocks-palette">Blocks</div>
}));

vi.mock('../TemplateLibrary', () => ({
  TemplateLibrary: () => <div data-testid="template-library">Templates</div>
}));

vi.mock('../PropertiesPanel', () => ({
  PropertiesPanel: () => <div data-testid="properties-panel">Properties</div>
}));

vi.mock('../GlobalStylesPanel', () => ({
  GlobalStylesPanel: () => <div data-testid="global-styles-panel">Global Styles</div>
}));

vi.mock('../PersonalizationPanel', () => ({
  PersonalizationPanel: () => <div data-testid="personalization-panel">Personalization</div>
}));

vi.mock('../PreviewDialog', () => ({
  PreviewDialog: () => null
}));

vi.mock('../SaveDraftDialog', () => ({
  SaveDraftDialog: () => null
}));

vi.mock('../ScheduleDialog', () => ({
  ScheduleDialog: () => null
}));

// Mock responsive hooks to return desktop by default
vi.mock('@/hooks/use-responsive', () => ({
  useIsMobile: vi.fn(() => false),
  useIsTablet: vi.fn(() => false),
  useIsDesktop: vi.fn(() => true),
}));

describe('NewsletterBuilder Layout', () => {
  it('renders three panes on desktop', () => {
    render(<NewsletterBuilder />);
    
    const grid = screen.getByTestId('campaigns-grid');
    expect(grid).toBeInTheDocument();
    
    // Should have three direct children (left, center, right)
    expect(grid.children.length).toBe(3);
  });

  it('has no shell-level container classes', () => {
    render(<NewsletterBuilder />);
    
    const grid = screen.getByTestId('campaigns-grid');
    const classList = Array.from(grid.classList);
    
    // Should not have max-width, mx-auto, or container classes at shell level
    const hasContainerClasses = classList.some(className => 
      className.includes('max-w-') || 
      className.includes('mx-auto') || 
      className.includes('container')
    );
    
    expect(hasContainerClasses).toBe(false);
  });

  it('renders all pane content', () => {
    render(<NewsletterBuilder />);
    
    // Left pane content
    expect(screen.getByTestId('blocks-palette')).toBeInTheDocument();
    expect(screen.getByTestId('template-library')).toBeInTheDocument();
    
    // Center pane content
    expect(screen.getByTestId('newsletter-canvas')).toBeInTheDocument();
    
    // Right pane content
    expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
  });
});