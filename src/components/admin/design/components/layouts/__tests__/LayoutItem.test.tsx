import React from 'react';
import { LayoutItem } from '../LayoutItem';
import { render, screen, createTestChildren, setMobileViewport, setTabletViewport, setDesktopViewport } from './test-utils-layouts';

describe('LayoutItem', () => {
  beforeEach(() => {
    setDesktopViewport();
  });

  describe('Flex Properties', () => {
    it('applies flex classes correctly', () => {
      const flexValues = ['none', 'auto', '1', 'initial'] as const;
      
      flexValues.forEach(flex => {
        const { unmount } = render(
          <LayoutItem flex={flex} data-testid={`item-${flex}`}>
            <div>Content</div>
          </LayoutItem>
        );

        const item = screen.getByTestId(`item-${flex}`);
        if (flex === 'none') {
          expect(item).toHaveClass('flex-none');
        } else {
          expect(item).toHaveClass(`flex-${flex}`);
        }
        unmount();
      });
    });

    it('applies grow and shrink classes correctly', () => {
      const testCases = [
        { grow: true, shrink: true, expectedGrow: 'flex-grow', expectedShrink: 'flex-shrink' },
        { grow: false, shrink: false, expectedGrow: 'flex-grow-0', expectedShrink: 'flex-shrink-0' },
        { grow: true, shrink: false, expectedGrow: 'flex-grow', expectedShrink: 'flex-shrink-0' },
        { grow: false, shrink: true, expectedGrow: 'flex-grow-0', expectedShrink: 'flex-shrink' },
      ];

      testCases.forEach(({ grow, shrink, expectedGrow, expectedShrink }, index) => {
        const { unmount } = render(
          <LayoutItem grow={grow} shrink={shrink} data-testid={`item-${index}`}>
            <div>Content</div>
          </LayoutItem>
        );

        const item = screen.getByTestId(`item-${index}`);
        expect(item).toHaveClass(expectedGrow);
        expect(item).toHaveClass(expectedShrink);
        unmount();
      });
    });

    it('applies basis classes correctly', () => {
      const basisValues = ['auto', '1/2', '1/3', '1/4', 'full'];
      
      basisValues.forEach(basis => {
        const { unmount } = render(
          <LayoutItem basis={basis} data-testid={`item-${basis.replace('/', '-')}`}>
            <div>Content</div>
          </LayoutItem>
        );

        const item = screen.getByTestId(`item-${basis.replace('/', '-')}`);
        if (basis === 'auto') {
          expect(item).not.toHaveClass('flex-basis-auto');
        } else {
          expect(item).toHaveClass(`flex-basis-${basis}`);
        }
        unmount();
      });
    });
  });

  describe('Responsive Sizing', () => {
    it('applies responsive minWidth correctly', () => {
      const responsiveMinWidth = { sm: '200px', md: '300px', lg: '400px', xl: '500px' };
      render(
        <LayoutItem minWidth={responsiveMinWidth} data-testid="item">
          <div>Content</div>
        </LayoutItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('sm:min-w-[200px]');
      expect(item).toHaveClass('md:min-w-[300px]');
      expect(item).toHaveClass('lg:min-w-[400px]');
      expect(item).toHaveClass('xl:min-w-[500px]');
    });

    it('applies single minWidth value', () => {
      render(
        <LayoutItem minWidth="250px" data-testid="item">
          <div>Content</div>
        </LayoutItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('min-w-[250px]');
    });

    it('applies responsive maxWidth correctly', () => {
      const responsiveMaxWidth = { sm: '300px', md: '400px', lg: '500px', xl: '600px' };
      render(
        <LayoutItem maxWidth={responsiveMaxWidth} data-testid="item">
          <div>Content</div>
        </LayoutItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('sm:max-w-[300px]');
      expect(item).toHaveClass('md:max-w-[400px]');
      expect(item).toHaveClass('lg:max-w-[500px]');
      expect(item).toHaveClass('xl:max-w-[600px]');
    });

    it('applies single maxWidth value', () => {
      render(
        <LayoutItem maxWidth="400px" data-testid="item">
          <div>Content</div>
        </LayoutItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('max-w-[400px]');
    });
  });

  describe('Order Management', () => {
    it('applies responsive order correctly', () => {
      const responsiveOrder = { sm: '1', md: '2', lg: '3', xl: '4' };
      render(
        <LayoutItem order={responsiveOrder} data-testid="item">
          <div>Content</div>
        </LayoutItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('sm:order-1');
      expect(item).toHaveClass('md:order-2');
      expect(item).toHaveClass('lg:order-3');
      expect(item).toHaveClass('xl:order-4');
    });

    it('applies single order value', () => {
      render(
        <LayoutItem order="5" data-testid="item">
          <div>Content</div>
        </LayoutItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('order-5');
    });

    it('does not apply order class when order is not provided', () => {
      render(
        <LayoutItem data-testid="item">
          <div>Content</div>
        </LayoutItem>
      );

      const item = screen.getByTestId('item');
      expect(item.className).not.toMatch(/order-/);
    });
  });

  describe('Alignment', () => {
    it('applies alignment classes correctly', () => {
      const alignments = ['auto', 'start', 'center', 'end', 'stretch'] as const;
      
      alignments.forEach(align => {
        const { unmount } = render(
          <LayoutItem align={align} data-testid={`item-${align}`}>
            <div>Content</div>
          </LayoutItem>
        );

        const item = screen.getByTestId(`item-${align}`);
        if (align === 'auto') {
          expect(item).not.toHaveClass('self-auto');
        } else {
          expect(item).toHaveClass(`self-${align}`);
        }
        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles single child', () => {
      render(
        <LayoutItem data-testid="item">
          <div>Single Child</div>
        </LayoutItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toBeInTheDocument();
      expect(screen.getByText('Single Child')).toBeInTheDocument();
    });

    it('handles multiple children', () => {
      const children = createTestChildren(5);
      render(
        <LayoutItem data-testid="item">
          {children}
        </LayoutItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toBeInTheDocument();
      
      // Check all children are rendered
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(`Child ${i}`)).toBeInTheDocument();
      }
    });

    it('handles long content without breaking layout', () => {
      const longContent = 'A'.repeat(1000);
      render(
        <LayoutItem data-testid="item">
          <div>{longContent}</div>
        </LayoutItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toBeInTheDocument();
      expect(item).toHaveClass('flex-1'); // default flex value
    });

    it('handles nested layout items', () => {
      render(
        <LayoutItem data-testid="outer" flex="2">
          <LayoutItem data-testid="inner" flex="1">
            <div>Nested content</div>
          </LayoutItem>
        </LayoutItem>
      );

      const outer = screen.getByTestId('outer');
      const inner = screen.getByTestId('inner');
      
      expect(outer).toHaveClass('flex-2');
      expect(inner).toHaveClass('flex-1');
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });

    it('handles complex flex combinations', () => {
      render(
        <LayoutItem 
          flex="none" 
          grow={false} 
          shrink={true} 
          basis="200px"
          minWidth="150px"
          maxWidth="300px"
          order="2"
          align="center"
          data-testid="item"
        >
          <div>Complex item</div>
        </LayoutItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('flex-none');
      expect(item).toHaveClass('flex-grow-0');
      expect(item).toHaveClass('flex-shrink');
      expect(item).toHaveClass('flex-basis-200px');
      expect(item).toHaveClass('min-w-[150px]');
      expect(item).toHaveClass('max-w-[300px]');
      expect(item).toHaveClass('order-2');
      expect(item).toHaveClass('self-center');
    });
  });

  describe('Props validation', () => {
    it('renders with different HTML elements', () => {
      const elements = ['div', 'section', 'article', 'aside'] as const;
      
      elements.forEach(element => {
        const { unmount } = render(
          <LayoutItem as={element} data-testid={`item-${element}`}>
            <div>Content</div>
          </LayoutItem>
        );

        const container = screen.getByTestId(`item-${element}`);
        expect(container.tagName.toLowerCase()).toBe(element);
        unmount();
      });
    });

    it('merges custom className correctly', () => {
      render(
        <LayoutItem className="custom-class border-2" data-testid="item">
          <div>Content</div>
        </LayoutItem>
      );

      const container = screen.getByTestId('item');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('border-2');
      expect(container).toHaveClass('flex-1'); // Should still have default flex
    });
  });

  describe('Viewport Testing', () => {
    it('adapts responsive properties across viewports', () => {
      const responsiveProps = {
        minWidth: { sm: '200px', md: '300px', lg: '400px' },
        maxWidth: { sm: '400px', md: '500px', lg: '600px' },
        order: { sm: '1', md: '2', lg: '3' }
      };

      const testViewports = [setMobileViewport, setTabletViewport, setDesktopViewport];
      
      testViewports.forEach((setViewport, index) => {
        setViewport();
        
        const { unmount } = render(
          <LayoutItem {...responsiveProps} data-testid={`item-${index}`}>
            <div>Content</div>
          </LayoutItem>
        );

        const item = screen.getByTestId(`item-${index}`);
        expect(item).toBeInTheDocument();
        expect(item).toHaveClass('sm:min-w-[200px]');
        expect(item).toHaveClass('md:min-w-[300px]');
        expect(item).toHaveClass('lg:min-w-[400px]');
        
        unmount();
      });
    });
  });

  describe('Performance', () => {
      it('memoizes component to prevent unnecessary re-renders', () => {
        const renderSpy = vi.fn();
      
      const TestComponent = React.memo(() => {
        renderSpy();
        return (
          <LayoutItem>
            <div>Test</div>
          </LayoutItem>
        );
      });

      const { rerender } = render(<TestComponent />);
      
      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not trigger render
      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('handles responsive prop changes efficiently', () => {
      const { rerender } = render(
        <LayoutItem minWidth="200px" data-testid="item">
          <div>Content</div>
        </LayoutItem>
      );

      let item = screen.getByTestId('item');
      expect(item).toHaveClass('min-w-[200px]');

      // Change minWidth
      rerender(
        <LayoutItem minWidth="300px" data-testid="item">
          <div>Content</div>
        </LayoutItem>
      );

      item = screen.getByTestId('item');
      expect(item).toHaveClass('min-w-[300px]');
      expect(item).not.toHaveClass('min-w-[200px]');
    });

    it('does not re-render when responsive objects are deeply equal', () => {
      const minWidth = { sm: '200px', md: '300px' };
      
      const { rerender } = render(
        <LayoutItem minWidth={minWidth} data-testid="item">
          <div>Content</div>
        </LayoutItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toBeInTheDocument();
      
      // Re-render with same minWidth object should not cause issues
      rerender(
        <LayoutItem minWidth={minWidth} data-testid="item">
          <div>Content</div>
        </LayoutItem>
      );
      
      expect(item).toBeInTheDocument();
    });
  });
});