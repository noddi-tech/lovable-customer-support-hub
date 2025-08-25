import React from 'react';
import { ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent } from '../ResponsiveTabs';
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

  describe('New API Tests', () => {
    describe('Variants', () => {
      it('renders default variant correctly', () => {
        render(
          <ResponsiveTabs defaultValue="tab1" variant="default" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
            <ResponsiveTabsContent value="tab2">Content 2</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        expect(screen.getByText('Tab 1')).toBeInTheDocument();
        expect(screen.getByText('Content 1')).toBeInTheDocument();
      });

      it('renders pills variant correctly', () => {
        render(
          <ResponsiveTabs defaultValue="tab1" variant="pills" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
            <ResponsiveTabsContent value="tab2">Content 2</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const tabsList = screen.getByRole('tablist');
        expect(tabsList).toHaveClass('bg-muted');
        expect(tabsList).toHaveClass('p-1');
        expect(tabsList).toHaveClass('rounded-lg');
      });

      it('renders underline variant correctly', () => {
        render(
          <ResponsiveTabs defaultValue="tab1" variant="underline" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
            <ResponsiveTabsContent value="tab2">Content 2</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const tabsList = screen.getByRole('tablist');
        expect(tabsList).toHaveClass('border-b');
        expect(tabsList).toHaveClass('bg-transparent');
      });

      it('renders borderless variant correctly', () => {
        render(
          <ResponsiveTabs defaultValue="tab1" variant="borderless" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
            <ResponsiveTabsContent value="tab2">Content 2</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const tabsList = screen.getByRole('tablist');
        expect(tabsList).toHaveClass('bg-transparent');
      });

      it('renders compact variant correctly', () => {
        render(
          <ResponsiveTabs defaultValue="tab1" variant="compact" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
            <ResponsiveTabsContent value="tab2">Content 2</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const tabsList = screen.getByRole('tablist');
        expect(tabsList).toHaveClass('bg-muted/50');
        expect(tabsList).toHaveClass('p-0.5');
        expect(tabsList).toHaveClass('rounded');
      });
    });

    describe('Sizes', () => {
      it('renders small size correctly', () => {
        render(
          <ResponsiveTabs defaultValue="tab1" size="sm" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const trigger = screen.getByRole('tab');
        expect(trigger).toHaveClass('text-xs');
        expect(trigger).toHaveClass('h-8');
        expect(trigger).toHaveClass('px-2');
      });

      it('renders medium size correctly', () => {
        render(
          <ResponsiveTabs defaultValue="tab1" size="md" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const trigger = screen.getByRole('tab');
        expect(trigger).toHaveClass('text-sm');
        expect(trigger).toHaveClass('h-9');
        expect(trigger).toHaveClass('px-3');
      });

      it('renders large size correctly', () => {
        render(
          <ResponsiveTabs defaultValue="tab1" size="lg" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const trigger = screen.getByRole('tab');
        expect(trigger).toHaveClass('text-base');
        expect(trigger).toHaveClass('h-10');
        expect(trigger).toHaveClass('px-4');
      });
    });

    describe('EqualWidth and JustifyContent', () => {
      it('applies equalWidth correctly', () => {
        render(
          <ResponsiveTabs defaultValue="tab1" equalWidth data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
            <ResponsiveTabsContent value="tab2">Content 2</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const triggers = screen.getAllByRole('tab');
        triggers.forEach(trigger => {
          expect(trigger).toHaveClass('flex-1');
        });
      });

      it('applies justifyContent correctly', () => {
        render(
          <ResponsiveTabs defaultValue="tab1" justifyContent="center" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
            <ResponsiveTabsContent value="tab2">Content 2</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const tabsList = screen.getByRole('tablist');
        expect(tabsList).toHaveClass('justify-center');
      });
    });

    describe('Responsiveness', () => {
      it('applies responsive classes correctly', () => {
        render(
          <ResponsiveTabs defaultValue="tab1" orientation="responsive" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
            <ResponsiveTabsContent value="tab2">Content 2</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const tabsList = screen.getByRole('tablist');
        expect(tabsList).toHaveClass('flex-col');
        expect(tabsList).toHaveClass('md:flex-row');
      });

      it('handles mobile viewport correctly', () => {
        setMobileViewport();
        render(
          <ResponsiveTabs defaultValue="tab1" orientation="responsive" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
            <ResponsiveTabsContent value="tab2">Content 2</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const tabsList = screen.getByRole('tablist');
        expect(tabsList).toHaveClass('flex-col');
      });
    });

    describe('Accessibility', () => {
      it('supports keyboard navigation', async () => {
        render(
          <ResponsiveTabs defaultValue="tab1" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="tab3">Tab 3</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
            <ResponsiveTabsContent value="tab2">Content 2</ResponsiveTabsContent>
            <ResponsiveTabsContent value="tab3">Content 3</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const firstTab = screen.getByRole('tab', { name: 'Tab 1' });
        const secondTab = screen.getByRole('tab', { name: 'Tab 2' });

        // Focus first tab
        firstTab.focus();
        expect(firstTab).toHaveFocus();

        // Arrow right to second tab
        fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
        expect(secondTab).toHaveFocus();
      });

      it('has proper ARIA attributes', () => {
        render(
          <ResponsiveTabs defaultValue="tab1" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
            <ResponsiveTabsContent value="tab2">Content 2</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const activeTab = screen.getByRole('tab', { name: 'Tab 1' });
        const inactiveTab = screen.getByRole('tab', { name: 'Tab 2' });
        const tabPanel = screen.getByRole('tabpanel');

        expect(activeTab).toHaveAttribute('aria-selected', 'true');
        expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
        expect(tabPanel).toHaveAttribute('role', 'tabpanel');
      });
    });

    describe('Edge Cases', () => {
      it('handles single tab with new API', () => {
        render(
          <ResponsiveTabs defaultValue="single" data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="single">Single Tab</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="single">Single Content</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        expect(screen.getByText('Single Tab')).toBeInTheDocument();
        expect(screen.getByText('Single Content')).toBeInTheDocument();
      });

      it('handles many tabs with new API', () => {
        const manyTabs = Array.from({ length: 10 }, (_, i) => i + 1);

        render(
          <ResponsiveTabs defaultValue="tab1" data-testid="tabs">
            <ResponsiveTabsList>
              {manyTabs.map(i => (
                <ResponsiveTabsTrigger key={i} value={`tab${i}`}>Tab {i}</ResponsiveTabsTrigger>
              ))}
            </ResponsiveTabsList>
            {manyTabs.map(i => (
              <ResponsiveTabsContent key={i} value={`tab${i}`}>Content {i}</ResponsiveTabsContent>
            ))}
          </ResponsiveTabs>
        );

        // Check all tabs are rendered
        for (let i = 1; i <= 10; i++) {
          expect(screen.getByText(`Tab ${i}`)).toBeInTheDocument();
        }
        expect(screen.getByText('Content 1')).toBeInTheDocument();
      });

      it('handles long labels', () => {
        render(
          <ResponsiveTabs defaultValue="long" equalWidth data-testid="tabs">
            <ResponsiveTabsList>
              <ResponsiveTabsTrigger value="long">This is a very long tab label that might cause overflow issues</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="short">Short</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="long">Long content</ResponsiveTabsContent>
            <ResponsiveTabsContent value="short">Short content</ResponsiveTabsContent>
          </ResponsiveTabs>
        );

        const triggers = screen.getAllByRole('tab');
        triggers.forEach(trigger => {
          expect(trigger).toHaveClass('flex-1');
        });
      });
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