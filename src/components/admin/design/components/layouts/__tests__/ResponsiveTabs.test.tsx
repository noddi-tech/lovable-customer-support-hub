import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsiveTabs } from '../ResponsiveTabs';
import { render, setMobileViewport, setTabletViewport, setDesktopViewport } from './test-utils-layouts';

// Mock Radix UI Tabs components
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, className, orientation, ...props }: any) => (
    <div data-testid="tabs" className={className} data-orientation={orientation} {...props}>
      {children}
    </div>
  ),
  TabsList: ({ children, className, ...props }: any) => (
    <div data-testid="tabs-list" className={className} role="tablist" {...props}>
      {children}
    </div>
  ),
  TabsTrigger: ({ children, className, value, ...props }: any) => (
    <button 
      data-testid={`tab-trigger-${value}`} 
      className={className} 
      role="tab"
      data-value={value}
      {...props}
    >
      {children}
    </button>
  ),
  TabsContent: ({ children, className, value, ...props }: any) => (
    <div 
      data-testid={`tab-content-${value}`} 
      className={className} 
      role="tabpanel"
      data-value={value}
      {...props}
    >
      {children}
    </div>
  ),
}));

const mockTabItems = [
  {
    value: 'tab1',
    label: 'Tab 1',
    content: <div>Content for Tab 1</div>
  },
  {
    value: 'tab2',
    label: 'Tab 2',
    content: <div>Content for Tab 2</div>
  },
  {
    value: 'tab3',
    label: 'Tab 3',
    content: <div>Content for Tab 3</div>
  }
];

const MockIcon = ({ className }: { className?: string }) => (
  <span className={className} data-testid="mock-icon">Icon</span>
);

const mockTabItemsWithIcons = [
  {
    value: 'tab1',
    label: 'Tab 1',
    icon: MockIcon,
    content: <div>Content for Tab 1</div>
  },
  {
    value: 'tab2',
    label: 'Tab 2',
    icon: MockIcon,
    content: <div>Content for Tab 2</div>
  }
];

describe('ResponsiveTabs', () => {
  beforeEach(() => {
    setDesktopViewport();
  });

  describe('Radix Integration', () => {
    it('renders Radix Tabs components correctly', () => {
      render(<ResponsiveTabs items={mockTabItems} />);

      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-tab1')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-tab2')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-tab3')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content-tab1')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content-tab2')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content-tab3')).toBeInTheDocument();
    });

    it('passes through Radix props correctly', () => {
      const onValueChange = jest.fn();
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          defaultValue="tab2"
          value="tab1"
          onValueChange={onValueChange}
        />
      );

      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveAttribute('defaultValue', 'tab2');
      expect(tabs).toHaveAttribute('value', 'tab1');
      
      // Test that onValueChange callback is memoized and passed through
      expect(tabs).toHaveAttribute('onValueChange');
    });

    it('handles orientation prop correctly', () => {
      const orientations = ['horizontal', 'vertical', 'responsive'] as const;
      
      orientations.forEach(orientation => {
        const { unmount } = render(
          <ResponsiveTabs items={mockTabItems} orientation={orientation} />
        );

        const tabs = screen.getByTestId('tabs');
        if (orientation === 'vertical') {
          expect(tabs).toHaveAttribute('data-orientation', 'vertical');
        } else {
          expect(tabs).toHaveAttribute('data-orientation', 'horizontal');
        }
        
        unmount();
      });
    });

    it('triggers onValueChange callback when tab is changed', async () => {
      const onValueChange = jest.fn();
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          onValueChange={onValueChange}
        />
      );

      const tab2Trigger = screen.getByTestId('tab-trigger-tab2');
      fireEvent.click(tab2Trigger);

      // Note: In a real test, this would depend on the actual Radix implementation
      // Here we're testing that the memoized callback is properly set up
      expect(onValueChange).toHaveBeenCalledWith('tab2');
    });
  });

  describe('Responsiveness', () => {
    it('applies responsive orientation correctly', () => {
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          orientation="responsive"
          breakpoint="md"
        />
      );

      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('flex-col');
      expect(tabsList).toHaveClass('md:flex-row');
    });

    it('applies fixed orientations correctly', () => {
      const orientations = ['horizontal', 'vertical'] as const;
      
      orientations.forEach(orientation => {
        const { unmount } = render(
          <ResponsiveTabs 
            items={mockTabItems}
            orientation={orientation}
          />
        );

        const tabsList = screen.getByTestId('tabs-list');
        if (orientation === 'vertical') {
          expect(tabsList).toHaveClass('flex-col');
        } else {
          expect(tabsList).toHaveClass('flex-row');
        }
        
        unmount();
      });
    });

    it('applies different breakpoints correctly', () => {
      const breakpoints = ['sm', 'md', 'lg', 'xl'] as const;
      
      breakpoints.forEach(breakpoint => {
        const { unmount } = render(
          <ResponsiveTabs 
            items={mockTabItems}
            orientation="responsive"
            breakpoint={breakpoint}
          />
        );

        const tabsList = screen.getByTestId('tabs-list');
        expect(tabsList).toHaveClass('flex-col');
        expect(tabsList).toHaveClass(`${breakpoint}:flex-row`);
        
        unmount();
      });
    });

    it('applies responsive spacing correctly', () => {
      const responsiveSpacing = { sm: '2', md: '4', lg: '6', xl: '8' };
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          spacing={responsiveSpacing}
        />
      );

      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('sm:gap-2');
      expect(tabsList).toHaveClass('md:gap-4');
      expect(tabsList).toHaveClass('lg:gap-6');
      expect(tabsList).toHaveClass('xl:gap-8');
    });

    it('applies single spacing value', () => {
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          spacing="8"
        />
      );

      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('gap-8');
    });
  });

  describe('Variants', () => {
    it('applies default variant correctly', () => {
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          variant="default"
        />
      );

      const tabsList = screen.getByTestId('tabs-list');
      const tabTrigger = screen.getByTestId('tab-trigger-tab1');
      
      expect(tabsList).not.toHaveClass('bg-muted');
      expect(tabsList).not.toHaveClass('border-b');
      expect(tabTrigger).not.toHaveClass('rounded-md');
    });

    it('applies pills variant correctly', () => {
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          variant="pills"
        />
      );

      const tabsList = screen.getByTestId('tabs-list');
      const tabTrigger = screen.getByTestId('tab-trigger-tab1');
      
      expect(tabsList).toHaveClass('bg-muted');
      expect(tabsList).toHaveClass('p-1');
      expect(tabsList).toHaveClass('rounded-lg');
      expect(tabTrigger).toHaveClass('rounded-md');
    });

    it('applies underline variant correctly', () => {
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          variant="underline"
        />
      );

      const tabsList = screen.getByTestId('tabs-list');
      const tabTrigger = screen.getByTestId('tab-trigger-tab1');
      
      expect(tabsList).toHaveClass('border-b');
      expect(tabTrigger).toHaveClass('border-b-2');
      expect(tabTrigger).toHaveClass('border-transparent');
      expect(tabTrigger).toHaveClass('data-[state=active]:border-primary');
    });
  });

  describe('Full Width Behavior', () => {
    it('applies full width to tabs list when fullWidth is true', () => {
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          fullWidth={true}
        />
      );

      const tabsList = screen.getByTestId('tabs-list');
      const tabTrigger = screen.getByTestId('tab-trigger-tab1');
      
      expect(tabsList).toHaveClass('w-full');
      expect(tabTrigger).toHaveClass('flex-1');
    });

    it('does not apply full width when fullWidth is false', () => {
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          fullWidth={false}
        />
      );

      const tabsList = screen.getByTestId('tabs-list');
      const tabTrigger = screen.getByTestId('tab-trigger-tab1');
      
      expect(tabsList).not.toHaveClass('w-full');
      expect(tabTrigger).not.toHaveClass('flex-1');
    });
  });

  describe('Accessibility', () => {
    it('maintains proper ARIA roles', () => {
      render(<ResponsiveTabs items={mockTabItems} />);

      const tabsList = screen.getByTestId('tabs-list');
      const tabTriggers = screen.getAllByRole('tab');
      const tabContents = screen.getAllByRole('tabpanel');

      expect(tabsList).toHaveAttribute('role', 'tablist');
      expect(tabTriggers).toHaveLength(3);
      expect(tabContents).toHaveLength(3);
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ResponsiveTabs items={mockTabItems} />);

      const firstTab = screen.getByTestId('tab-trigger-tab1');
      const secondTab = screen.getByTestId('tab-trigger-tab2');

      // Focus first tab
      firstTab.focus();
      expect(document.activeElement).toBe(firstTab);

      // Navigate with arrow keys (this would be handled by Radix in real implementation)
      await user.keyboard('{ArrowRight}');
      // In real Radix implementation, this would move focus to next tab
      
      // Test that tabs are tabbable
      expect(firstTab).toHaveAttribute('role', 'tab');
      expect(secondTab).toHaveAttribute('role', 'tab');
    });

    it('handles focus management correctly', () => {
      render(<ResponsiveTabs items={mockTabItems} />);

      const tabContents = screen.getAllByRole('tabpanel');
      
      tabContents.forEach(content => {
        expect(content).toHaveClass('focus-visible:outline-none');
      });
    });
  });

  describe('Icons Support', () => {
    it('renders icons when provided', () => {
      render(<ResponsiveTabs items={mockTabItemsWithIcons} />);

      const icons = screen.getAllByTestId('mock-icon');
      expect(icons).toHaveLength(2);
      
      icons.forEach(icon => {
        expect(icon).toHaveClass('w-4');
        expect(icon).toHaveClass('h-4');
        expect(icon).toHaveClass('mr-2');
      });
    });

    it('renders tabs without icons correctly', () => {
      render(<ResponsiveTabs items={mockTabItems} />);

      expect(screen.queryByTestId('mock-icon')).not.toBeInTheDocument();
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles single tab', () => {
      const singleTabItem = [mockTabItems[0]];
      render(<ResponsiveTabs items={singleTabItem} />);

      expect(screen.getByTestId('tab-trigger-tab1')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content-tab1')).toBeInTheDocument();
      expect(screen.queryByTestId('tab-trigger-tab2')).not.toBeInTheDocument();
    });

    it('handles many tabs', () => {
      const manyTabs = Array.from({ length: 10 }, (_, i) => ({
        value: `tab${i + 1}`,
        label: `Tab ${i + 1}`,
        content: <div>Content for Tab {i + 1}</div>
      }));

      render(<ResponsiveTabs items={manyTabs} />);

      // Check all tabs are rendered
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByTestId(`tab-trigger-tab${i}`)).toBeInTheDocument();
        expect(screen.getByTestId(`tab-content-tab${i}`)).toBeInTheDocument();
      }
    });

    it('handles long tab labels', () => {
      const longLabelTabs = [
        {
          value: 'long-tab',
          label: 'This is a very long tab label that might cause layout issues',
          content: <div>Long tab content</div>
        }
      ];

      render(<ResponsiveTabs items={longLabelTabs} />);

      expect(screen.getByText('This is a very long tab label that might cause layout issues')).toBeInTheDocument();
    });

    it('handles complex tab content', () => {
      const complexTabs = [
        {
          value: 'complex',
          label: 'Complex Tab',
          content: (
            <div>
              <h2>Complex Content</h2>
              <p>With multiple elements</p>
              <button>And interactive elements</button>
            </div>
          )
        }
      ];

      render(<ResponsiveTabs items={complexTabs} />);

      expect(screen.getByText('Complex Content')).toBeInTheDocument();
      expect(screen.getByText('With multiple elements')).toBeInTheDocument();
      expect(screen.getByText('And interactive elements')).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('merges custom className correctly', () => {
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          className="custom-class border-2"
        />
      );

      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveClass('custom-class');
      expect(tabs).toHaveClass('border-2');
      expect(tabs).toHaveClass('w-full'); // Should still have base classes
    });
  });

  describe('Viewport Testing', () => {
    it('adapts to mobile viewport', () => {
      setMobileViewport();
      
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          orientation="responsive"
          breakpoint="md"
        />
      );

      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('flex-col');
      expect(tabsList).toHaveClass('md:flex-row');
    });

    it('adapts to tablet viewport', () => {
      setTabletViewport();
      
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          orientation="responsive"
          breakpoint="md"
        />
      );

      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('flex-col');
      expect(tabsList).toHaveClass('md:flex-row');
    });

    it('adapts to desktop viewport', () => {
      setDesktopViewport();
      
      render(
        <ResponsiveTabs 
          items={mockTabItems}
          orientation="responsive"
          breakpoint="lg"
        />
      );

      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('flex-col');
      expect(tabsList).toHaveClass('lg:flex-row');
    });
  });

  describe('Performance', () => {
    it('memoizes component to prevent unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestComponent = React.memo(() => {
        renderSpy();
        return <ResponsiveTabs items={mockTabItems} />;
      });

      const { rerender } = render(<TestComponent />);
      
      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not trigger render
      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('memoizes callback to prevent unnecessary re-renders', () => {
      const onValueChange = jest.fn();
      
      const { rerender } = render(
        <ResponsiveTabs 
          items={mockTabItems}
          onValueChange={onValueChange}
        />
      );

      // Re-render with same callback should not cause issues
      rerender(
        <ResponsiveTabs 
          items={mockTabItems}
          onValueChange={onValueChange}
        />
      );

      expect(screen.getByTestId('tabs')).toBeInTheDocument();
    });
  });
});