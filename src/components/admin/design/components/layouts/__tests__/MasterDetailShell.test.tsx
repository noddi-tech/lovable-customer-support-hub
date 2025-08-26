import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MasterDetailShell } from '../MasterDetailShell';
import { useIsMobile } from '@/hooks/use-responsive';

// Mock the responsive hook
vi.mock('@/hooks/use-responsive', () => ({
  useIsMobile: vi.fn(),
}));

const mockUseIsMobile = vi.mocked(useIsMobile);

describe('MasterDetailShell', () => {
  const mockProps = {
    left: <div data-testid="left-pane">Inbox List</div>,
    center: <div data-testid="center-pane">Conversation List</div>,
    detailLeft: <div data-testid="detail-left">Message Thread</div>,
    detailRight: <div data-testid="detail-right">Reply Sidebar</div>,
    isDetail: false,
    onBack: vi.fn(),
    backButtonLabel: 'Back to Inbox',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('List Mode', () => {
    it('renders left and center panes in list mode', () => {
      mockUseIsMobile.mockReturnValue(false);
      
      render(<MasterDetailShell {...mockProps} />);
      
      expect(screen.getByTestId('left-pane')).toBeInTheDocument();
      expect(screen.getByTestId('center-pane')).toBeInTheDocument();
      expect(screen.queryByTestId('detail-left')).not.toBeInTheDocument();
      expect(screen.queryByTestId('detail-right')).not.toBeInTheDocument();
    });

    it('shows only center pane on mobile in list mode', () => {
      mockUseIsMobile.mockReturnValue(true);
      
      render(<MasterDetailShell {...mockProps} />);
      
      expect(screen.getByTestId('center-pane')).toBeInTheDocument();
      expect(screen.queryByTestId('left-pane')).not.toBeInTheDocument();
    });
  });

  describe('Detail Mode', () => {
    const detailProps = {
      ...mockProps,
      isDetail: true,
    };

    it('renders detail panes in detail mode', () => {
      mockUseIsMobile.mockReturnValue(false);
      
      render(<MasterDetailShell {...detailProps} />);
      
      expect(screen.getByTestId('detail-left')).toBeInTheDocument();
      expect(screen.getByTestId('detail-right')).toBeInTheDocument();
      expect(screen.queryByTestId('left-pane')).not.toBeInTheDocument();
      expect(screen.queryByTestId('center-pane')).not.toBeInTheDocument();
    });

    it('shows back button on mobile in detail mode', () => {
      mockUseIsMobile.mockReturnValue(true);
      
      render(<MasterDetailShell {...detailProps} />);
      
      const backButton = screen.getByRole('button', { name: /back to inbox/i });
      expect(backButton).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', () => {
      mockUseIsMobile.mockReturnValue(true);
      
      render(<MasterDetailShell {...detailProps} />);
      
      const backButton = screen.getByRole('button', { name: /back to inbox/i });
      fireEvent.click(backButton);
      
      expect(mockProps.onBack).toHaveBeenCalledTimes(1);
    });

    it('opens actions as sheet on mobile', () => {
      mockUseIsMobile.mockReturnValue(true);
      
      render(<MasterDetailShell {...detailProps} />);
      
      const actionsButton = screen.getByRole('button', { name: /actions & reply/i });
      expect(actionsButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels for panes', () => {
      mockUseIsMobile.mockReturnValue(false);
      
      render(
        <MasterDetailShell 
          {...mockProps}
          leftPaneLabel="Inbox navigation"
          centerPaneLabel="Message list"
        />
      );
      
      const leftPane = screen.getByLabelText('Inbox navigation');
      const centerPane = screen.getByLabelText('Message list');
      
      expect(leftPane).toBeInTheDocument();
      expect(centerPane).toBeInTheDocument();
    });

    it('has accessible back button', () => {
      mockUseIsMobile.mockReturnValue(true);
      
      render(<MasterDetailShell {...mockProps} isDetail={true} />);
      
      const backButton = screen.getByRole('button', { name: 'Back to Inbox' });
      expect(backButton).toHaveAttribute('aria-label', 'Back to Inbox');
    });
  });

  describe('Responsive Behavior', () => {
    it('switches layout based on mobile state', () => {
      const { rerender } = render(<MasterDetailShell {...mockProps} />);
      
      // Desktop layout
      mockUseIsMobile.mockReturnValue(false);
      rerender(<MasterDetailShell {...mockProps} />);
      
      expect(screen.getByTestId('left-pane')).toBeInTheDocument();
      expect(screen.getByTestId('center-pane')).toBeInTheDocument();
      
      // Mobile layout
      mockUseIsMobile.mockReturnValue(true);
      rerender(<MasterDetailShell {...mockProps} />);
      
      expect(screen.queryByTestId('left-pane')).not.toBeInTheDocument();
      expect(screen.getByTestId('center-pane')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('toggles between list and detail modes', () => {
      const { rerender } = render(<MasterDetailShell {...mockProps} />);
      
      // List mode
      expect(screen.getByTestId('center-pane')).toBeInTheDocument();
      
      // Switch to detail mode
      rerender(<MasterDetailShell {...mockProps} isDetail={true} />);
      expect(screen.queryByTestId('center-pane')).not.toBeInTheDocument();
      expect(screen.getByTestId('detail-left')).toBeInTheDocument();
    });

    it('handles missing detail content gracefully', () => {
      render(
        <MasterDetailShell 
          {...mockProps}
          isDetail={true}
          detailLeft={undefined}
          detailRight={undefined}
        />
      );
      
      expect(screen.queryByTestId('detail-left')).not.toBeInTheDocument();
      expect(screen.queryByTestId('detail-right')).not.toBeInTheDocument();
    });
  });
});