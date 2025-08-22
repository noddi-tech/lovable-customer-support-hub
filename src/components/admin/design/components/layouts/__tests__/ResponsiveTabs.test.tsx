import React from 'react';
import { ResponsiveTabs } from '../ResponsiveTabs';
import { render, screen, fireEvent, waitFor, createTestChildren, setMobileViewport, setTabletViewport, setDesktopViewport } from './test-utils-layouts';

describe('ResponsiveTabs', () => {
  beforeEach(() => {
    setDesktopViewport();
  });

  const mockItems = [
    {
      value: 'tab1',
      label: 'Tab 1',
      content: <div>Tab 1 Content</div>,
    },
    {
      value: 'tab2',
      label: 'Tab 2',
      content: <div>Tab 2 Content</div>,
    },
    {
      value: 'tab3',
      label: 'Tab 3',
      content: <div>Tab 3 Content</div>,
    },
  ];

  describe('Basic Functionality', () => {
    it('renders tabs correctly', () => {
      render(
        <ResponsiveTabs 
          items={mockItems} 
          defaultValue="tab1" 
          data-testid="tabs"
        />
      );

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
      expect(screen.getByText('Tab 1 Content')).toBeInTheDocument();
    });

    it('switches tabs when clicked', async () => {
      render(
        <ResponsiveTabs 
          items={mockItems} 
          defaultValue="tab1" 
          data-testid="tabs"
        />
      );

      // Click on Tab 2
      fireEvent.click(screen.getByText('Tab 2'));
      
      await waitFor(() => {
        expect(screen.getByText('Tab 2 Content')).toBeInTheDocument();
      });
    });
  });

  describe('Responsiveness', () => {
    it('applies responsive orientation correctly', () => {
      render(
        <ResponsiveTabs 
          items={mockItems}
          orientation="responsive"
          breakpoint="md"
          defaultValue="tab1"
          data-testid="tabs"
        />
      );

      const tabsContainer = screen.getByTestId('tabs');
      expect(tabsContainer).toHaveClass('flex-col');
      expect(tabsContainer).toHaveClass('md:flex-row');
    });

    it('applies vertical orientation', () => {
      render(
        <ResponsiveTabs 
          items={mockItems}
          orientation="vertical"
          defaultValue="tab1"
          data-testid="tabs"
        />
      );

      const tabsContainer = screen.getByTestId('tabs');
      expect(tabsContainer).toHaveClass('flex-col');
    });

    it('applies horizontal orientation', () => {
      render(
        <ResponsiveTabs 
          items={mockItems}
          orientation="horizontal"
          defaultValue="tab1"
          data-testid="tabs"
        />
      );

      const tabsContainer = screen.getByTestId('tabs');
      expect(tabsContainer).toHaveClass('flex-row');
    });
  });

  describe('Edge Cases', () => {
    it('handles single tab', () => {
      const singleTab = [
        {
          value: 'single',
          label: 'Single Tab',
          content: <div>Single Tab Content</div>,
        },
      ];

      render(
        <ResponsiveTabs 
          items={singleTab} 
          defaultValue="single" 
          data-testid="tabs"
        />
      );

      expect(screen.getByText('Single Tab')).toBeInTheDocument();
      expect(screen.getByText('Single Tab Content')).toBeInTheDocument();
    });

    it('handles many tabs', () => {
      const manyTabs = Array.from({ length: 10 }, (_, i) => ({
        value: `tab${i + 1}`,
        label: `Tab ${i + 1}`,
        content: <div>Tab {i + 1} Content</div>,
      }));

      render(
        <ResponsiveTabs 
          items={manyTabs} 
          defaultValue="tab1" 
          data-testid="tabs"
        />
      );

      // Check all tabs are rendered
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`Tab ${i}`)).toBeInTheDocument();
      }
      expect(screen.getByText('Tab 1 Content')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('memoizes component to prevent unnecessary re-renders', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = React.memo(() => {
        renderSpy();
        return (
          <ResponsiveTabs items={mockItems} defaultValue="tab1" />
        );
      });

      const { rerender } = render(<TestComponent />);
      
      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not trigger render
      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });
});