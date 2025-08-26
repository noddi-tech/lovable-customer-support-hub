import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MasterDetailShell } from '../MasterDetailShell';
import { BrowserRouter } from 'react-router-dom';

// Mock the responsive hook
const mockUseIsMobile = vi.fn();
vi.mock('@/hooks/use-responsive', () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Responsive Breakpoints', () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Desktop/Tablet Layout', () => {
    it('should render two-pane list layout on desktop', () => {
      render(
        <TestWrapper>
          <MasterDetailShell
            isDetail={false}
            onBack={() => {}}
            left={<div data-testid="left-pane">Left Pane</div>}
            center={<div data-testid="center-pane">Center Pane</div>}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('left-pane')).toBeInTheDocument();
      expect(screen.getByTestId('center-pane')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });

    it('should render two-pane detail layout on desktop', () => {
      render(
        <TestWrapper>
          <MasterDetailShell
            isDetail={true}
            onBack={() => {}}
            detailLeft={<div data-testid="detail-left">Detail Content</div>}
            detailRight={<div data-testid="detail-right">Detail Actions</div>}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('detail-left')).toBeInTheDocument();
      expect(screen.getByTestId('detail-right')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });

    it('should use grid layout classes on desktop', () => {
      const { container } = render(
        <TestWrapper>
          <MasterDetailShell
            isDetail={false}
            onBack={() => {}}
            left={<div>Left</div>}
            center={<div>Center</div>}
          />
        </TestWrapper>
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('md:grid-cols-[280px_1fr]');
    });
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it('should render single pane with back button on mobile detail view', () => {
      const mockOnBack = vi.fn();
      
      render(
        <TestWrapper>
          <MasterDetailShell
            isDetail={true}
            onBack={mockOnBack}
            detailLeft={<div data-testid="detail-content">Detail Content</div>}
            detailRight={<div data-testid="detail-actions">Detail Actions</div>}
            backButtonLabel="Back to List"
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('detail-content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to List' })).toBeInTheDocument();
      
      // Actions should be in a Sheet trigger on mobile
      expect(screen.getByText('Actions & Reply')).toBeInTheDocument();
    });

    it('should render center pane only on mobile list view', () => {
      render(
        <TestWrapper>
          <MasterDetailShell
            isDetail={false}
            onBack={() => {}}
            left={<div data-testid="left-pane">Left Pane</div>}
            center={<div data-testid="center-pane">Center Pane</div>}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('center-pane')).toBeInTheDocument();
      // Left pane should not be visible on mobile list view
      expect(screen.queryByTestId('left-pane')).not.toBeInTheDocument();
    });

    it('should use flex layout on mobile', () => {
      const { container } = render(
        <TestWrapper>
          <MasterDetailShell
            isDetail={true}
            onBack={() => {}}
            detailLeft={<div>Detail</div>}
          />
        </TestWrapper>
      );

      expect(container.firstChild).toHaveClass('flex', 'flex-col');
    });
  });

  describe('Responsive Transitions', () => {
    it('should adapt layout when switching from mobile to desktop', () => {
      const { rerender } = render(
        <TestWrapper>
          <MasterDetailShell
            isDetail={false}
            onBack={() => {}}
            left={<div data-testid="left-pane">Left</div>}
            center={<div data-testid="center-pane">Center</div>}
          />
        </TestWrapper>
      );

      // Start mobile - only center visible
      expect(screen.queryByTestId('left-pane')).not.toBeInTheDocument();
      expect(screen.getByTestId('center-pane')).toBeInTheDocument();

      // Switch to desktop
      act(() => {
        mockUseIsMobile.mockReturnValue(false);
      });

      rerender(
        <TestWrapper>
          <MasterDetailShell
            isDetail={false}
            onBack={() => {}}
            left={<div data-testid="left-pane">Left</div>}
            center={<div data-testid="center-pane">Center</div>}
          />
        </TestWrapper>
      );

      // Now both should be visible
      expect(screen.getByTestId('left-pane')).toBeInTheDocument();
      expect(screen.getByTestId('center-pane')).toBeInTheDocument();
    });

    it('should handle detail to list transition on mobile', () => {
      const mockOnBack = vi.fn();
      
      const { rerender } = render(
        <TestWrapper>
          <MasterDetailShell
            isDetail={true}
            onBack={mockOnBack}
            center={<div data-testid="center-pane">List</div>}
            detailLeft={<div data-testid="detail-content">Detail</div>}
          />
        </TestWrapper>
      );

      // Detail view - should show detail and back button
      expect(screen.getByTestId('detail-content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();

      // Switch to list view
      rerender(
        <TestWrapper>
          <MasterDetailShell
            isDetail={false}
            onBack={mockOnBack}
            center={<div data-testid="center-pane">List</div>}
            detailLeft={<div data-testid="detail-content">Detail</div>}
          />
        </TestWrapper>
      );

      // List view - should show center and no back button
      expect(screen.getByTestId('center-pane')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });
  });

  describe('ScrollArea Integration', () => {
    it('should apply proper scroll containers', () => {
      const { container } = render(
        <TestWrapper>
          <MasterDetailShell
            isDetail={false}
            onBack={() => {}}
            left={<div>Left Content</div>}
            center={<div>Center Content</div>}
          />
        </TestWrapper>
      );

      // Should have ScrollArea components
      const scrollAreas = container.querySelectorAll('[data-radix-scroll-area-viewport]');
      expect(scrollAreas.length).toBeGreaterThan(0);
    });

    it('should maintain independent scrolling in each pane', () => {
      render(
        <TestWrapper>
          <MasterDetailShell
            isDetail={true}
            onBack={() => {}}
            detailLeft={<div style={{ height: '200vh' }}>Long Content</div>}
            detailRight={<div style={{ height: '300vh' }}>Longer Content</div>}
          />
        </TestWrapper>
      );

      // Each pane should have its own scroll area
      const scrollViewports = document.querySelectorAll('[data-radix-scroll-area-viewport]');
      expect(scrollViewports.length).toBeGreaterThanOrEqual(2);
    });
  });
});