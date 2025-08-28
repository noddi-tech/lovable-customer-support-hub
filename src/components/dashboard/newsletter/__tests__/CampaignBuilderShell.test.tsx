import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CampaignBuilderShell } from '../CampaignBuilderShell';

// Mock responsive hooks
vi.mock('@/hooks/use-responsive', () => ({
  useIsMobile: vi.fn(() => false),
  useIsTablet: vi.fn(() => false),
  useIsDesktop: vi.fn(() => true),
}));

const mockProps = {
  toolbar: <div data-testid="toolbar">Toolbar</div>,
  left: <div data-testid="left-pane">Left Pane</div>,
  center: <div data-testid="center-pane">Center Pane</div>,
  right: <div data-testid="right-pane">Right Pane</div>,
};

describe('CampaignBuilderShell', () => {
  it('renders three panes on desktop', () => {
    render(<CampaignBuilderShell {...mockProps} />);
    
    const grid = screen.getByTestId('campaigns-grid');
    expect(grid).toBeInTheDocument();
    
    // Should have three direct children (left, center, right)
    expect(grid.children.length).toBe(3);
    
    // All panes should be visible
    expect(screen.getByTestId('left-pane')).toBeInTheDocument();
    expect(screen.getByTestId('center-pane')).toBeInTheDocument();
    expect(screen.getByTestId('right-pane')).toBeInTheDocument();
  });

  it('renders toolbar when provided', () => {
    render(<CampaignBuilderShell {...mockProps} />);
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('does not have shell-level container classes', () => {
    render(<CampaignBuilderShell {...mockProps} />);
    
    const grid = screen.getByTestId('campaigns-grid');
    const classList = Array.from(grid.classList);
    
    // Should not have max-width, mx-auto, or container classes
    const hasContainerClasses = classList.some(className => 
      className.includes('max-w-') || 
      className.includes('mx-auto') || 
      className.includes('container')
    );
    
    expect(hasContainerClasses).toBe(false);
  });
});