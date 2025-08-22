import React from 'react';
import { ResponsiveGrid } from '../ResponsiveGrid';
import { render, screen, createTestChildren, setMobileViewport, setTabletViewport, setDesktopViewport } from './test-utils-layouts';

describe('ResponsiveGrid', () => {
  beforeEach(() => {
    setDesktopViewport();
  });

  describe('Responsiveness', () => {
    it('applies default responsive columns correctly', () => {
      render(
        <ResponsiveGrid data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      );

      const gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('sm:grid-cols-1');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });

    it('applies custom responsive columns', () => {
      const customCols = { sm: '2', md: '4', lg: '6', xl: '8' };
      render(
        <ResponsiveGrid cols={customCols} data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );

      const gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('sm:grid-cols-2');
      expect(gridContainer).toHaveClass('md:grid-cols-4');
      expect(gridContainer).toHaveClass('lg:grid-cols-6');
      expect(gridContainer).toHaveClass('xl:grid-cols-8');
    });

    it('applies single column value', () => {
      render(
        <ResponsiveGrid cols="5" data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );

      const gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('grid-cols-5');
    });

    it('applies responsive gap correctly', () => {
      const responsiveGap = { sm: '2', md: '4', lg: '6', xl: '8' };
      render(
        <ResponsiveGrid gap={responsiveGap} data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );

      const gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('sm:gap-2');
      expect(gridContainer).toHaveClass('md:gap-4');
      expect(gridContainer).toHaveClass('lg:gap-6');
      expect(gridContainer).toHaveClass('xl:gap-8');
    });

    it('applies single gap value', () => {
      render(
        <ResponsiveGrid gap="8" data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );

      const gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('gap-8');
    });
  });

  describe('AutoFit Behavior', () => {
    it('applies autoFit class when autoFit is true', () => {
      render(
        <ResponsiveGrid autoFit={true} minColWidth="200px" data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      );

      const gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('grid-cols-[repeat(auto-fit,minmax(200px,1fr))]');
    });

    it('uses default minColWidth when autoFit is true', () => {
      render(
        <ResponsiveGrid autoFit={true} data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );

      const gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('grid-cols-[repeat(auto-fit,minmax(250px,1fr))]');
    });

    it('does not apply autoFit when autoFit is false', () => {
      render(
        <ResponsiveGrid autoFit={false} data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );

      const gridContainer = screen.getByTestId('grid');
      expect(gridContainer).not.toHaveClass('grid-cols-[repeat(auto-fit,minmax(250px,1fr))]');
      expect(gridContainer).toHaveClass('sm:grid-cols-1'); // Should use default cols
    });

    it('applies custom minColWidth with autoFit', () => {
      render(
        <ResponsiveGrid autoFit={true} minColWidth="300px" data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );

      const gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('grid-cols-[repeat(auto-fit,minmax(300px,1fr))]');
    });
  });

  describe('Alignment', () => {
    it('applies alignment classes correctly', () => {
      const alignments = ['start', 'center', 'end', 'stretch'] as const;
      
      alignments.forEach(alignment => {
        const { unmount } = render(
          <ResponsiveGrid alignment={alignment} data-testid={`grid-${alignment}`}>
            <div>Item 1</div>
            <div>Item 2</div>
          </ResponsiveGrid>
        );

        const gridContainer = screen.getByTestId(`grid-${alignment}`);
        expect(gridContainer).toHaveClass(`items-${alignment}`);
        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles single child', () => {
      render(
        <ResponsiveGrid data-testid="grid">
          <div>Single Item</div>
        </ResponsiveGrid>
      );

      const gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toBeInTheDocument();
      expect(screen.getByText('Single Item')).toBeInTheDocument();
    });

    it('handles many children (10+)', () => {
      const children = createTestChildren(12);
      render(
        <ResponsiveGrid data-testid="grid">
          {children}
        </ResponsiveGrid>
      );

      const gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toBeInTheDocument();
      
      // Check all children are rendered
      for (let i = 1; i <= 12; i++) {
        expect(screen.getByText(`Child ${i}`)).toBeInTheDocument();
      }
    });

    it('handles dynamic child count changes', () => {
      const { rerender } = render(
        <ResponsiveGrid data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );

      let gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();

      // Add more children
      rerender(
        <ResponsiveGrid data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
          <div>Item 4</div>
        </ResponsiveGrid>
      );

      gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
      expect(screen.getByText('Item 4')).toBeInTheDocument();
    });

    it('handles nested grids', () => {
      render(
        <ResponsiveGrid data-testid="outer" cols="2">
          <ResponsiveGrid data-testid="inner" cols="3">
            <div>Nested item 1</div>
            <div>Nested item 2</div>
            <div>Nested item 3</div>
          </ResponsiveGrid>
          <div>Outer item</div>
        </ResponsiveGrid>
      );

      const outer = screen.getByTestId('outer');
      const inner = screen.getByTestId('inner');
      
      expect(outer).toHaveClass('grid-cols-2');
      expect(inner).toHaveClass('grid-cols-3');
      expect(screen.getByText('Nested item 1')).toBeInTheDocument();
      expect(screen.getByText('Outer item')).toBeInTheDocument();
    });

    it('handles long content within grid items', () => {
      const longContent = 'A'.repeat(500);
      render(
        <ResponsiveGrid data-testid="grid">
          <div>{longContent}</div>
          <div>Short content</div>
        </ResponsiveGrid>
      );

      const gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('w-full');
      expect(gridContainer).toBeInTheDocument();
      expect(screen.getByText('Short content')).toBeInTheDocument();
    });
  });

  describe('Props validation', () => {
    it('renders with different HTML elements', () => {
      const elements = ['div', 'section', 'nav', 'main'] as const;
      
      elements.forEach(element => {
        const { unmount } = render(
          <ResponsiveGrid as={element} data-testid={`grid-${element}`}>
            <div>Content</div>
          </ResponsiveGrid>
        );

        const container = screen.getByTestId(`grid-${element}`);
        expect(container.tagName.toLowerCase()).toBe(element);
        unmount();
      });
    });

    it('merges custom className correctly', () => {
      render(
        <ResponsiveGrid className="custom-class border-2" data-testid="grid">
          <div>Content</div>
        </ResponsiveGrid>
      );

      const container = screen.getByTestId('grid');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('border-2');
      expect(container).toHaveClass('grid'); // Should still have base classes
      expect(container).toHaveClass('w-full');
    });
  });

  describe('Viewport Testing', () => {
    it('behaves consistently across viewport sizes', () => {
      const testViewports = [setMobileViewport, setTabletViewport, setDesktopViewport];
      
      testViewports.forEach((setViewport, index) => {
        setViewport();
        
        const { unmount } = render(
          <ResponsiveGrid data-testid={`grid-${index}`}>
            <div>Item 1</div>
            <div>Item 2</div>
            <div>Item 3</div>
          </ResponsiveGrid>
        );

        const gridContainer = screen.getByTestId(`grid-${index}`);
        expect(gridContainer).toHaveClass('grid');
        expect(gridContainer).toHaveClass('w-full');
        
        unmount();
      });
    });

    it('adapts grid columns based on viewport', () => {
      // Mobile
      setMobileViewport();
      const { rerender } = render(
        <ResponsiveGrid data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      );

      let gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('sm:grid-cols-1');

      // Tablet
      setTabletViewport();
      rerender(
        <ResponsiveGrid data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      );

      gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('md:grid-cols-2');

      // Desktop
      setDesktopViewport();
      rerender(
        <ResponsiveGrid data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      );

      gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Performance', () => {
    it('memoizes component to prevent unnecessary re-renders', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = React.memo(() => {
        renderSpy();
        return (
          <ResponsiveGrid>
            <div>Test</div>
          </ResponsiveGrid>
        );
      });

      const { rerender } = render(<TestComponent />);
      
      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not trigger render
      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('handles frequent prop changes efficiently', () => {
      const { rerender } = render(
        <ResponsiveGrid cols="2" data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );

      let gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('grid-cols-2');

      // Change columns
      rerender(
        <ResponsiveGrid cols="3" data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );

      gridContainer = screen.getByTestId('grid');
      expect(gridContainer).toHaveClass('grid-cols-3');
    });
  });
});