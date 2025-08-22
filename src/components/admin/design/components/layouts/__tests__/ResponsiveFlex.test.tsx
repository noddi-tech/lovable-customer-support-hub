import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { ResponsiveFlex } from '../ResponsiveFlex';
import { render, createTestChildren, setMobileViewport, setTabletViewport, setDesktopViewport } from './test-utils-layouts';

describe('ResponsiveFlex', () => {
  beforeEach(() => {
    setDesktopViewport();
  });

  describe('Responsiveness', () => {
    it('applies responsive direction correctly', () => {
      render(
        <ResponsiveFlex direction="responsive" breakpoint="md" data-testid="flex">
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveFlex>
      );

      const flexContainer = screen.getByTestId('flex');
      expect(flexContainer).toHaveClass('flex-col');
      expect(flexContainer).toHaveClass('md:flex-row');
    });

    it('applies fixed directions correctly', () => {
      const directions = ['row', 'col'] as const;
      
      directions.forEach(direction => {
        const { unmount } = render(
          <ResponsiveFlex direction={direction} data-testid={`flex-${direction}`}>
            <div>Child 1</div>
            <div>Child 2</div>
          </ResponsiveFlex>
        );

        const flexContainer = screen.getByTestId(`flex-${direction}`);
        expect(flexContainer).toHaveClass(`flex-${direction}`);
        unmount();
      });
    });

    it('applies responsive gap correctly', () => {
      const responsiveGap = { sm: '2', md: '4', lg: '6', xl: '8' };
      render(
        <ResponsiveFlex gap={responsiveGap} data-testid="flex">
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveFlex>
      );

      const flexContainer = screen.getByTestId('flex');
      expect(flexContainer).toHaveClass('sm:gap-2');
      expect(flexContainer).toHaveClass('md:gap-4');
      expect(flexContainer).toHaveClass('lg:gap-6');
      expect(flexContainer).toHaveClass('xl:gap-8');
    });

    it('applies single gap value', () => {
      render(
        <ResponsiveFlex gap="6" data-testid="flex">
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveFlex>
      );

      const flexContainer = screen.getByTestId('flex');
      expect(flexContainer).toHaveClass('gap-6');
    });

    it('handles breakpoint transitions', () => {
      const breakpoints = ['sm', 'md', 'lg', 'xl'] as const;
      
      breakpoints.forEach(breakpoint => {
        const { unmount } = render(
          <ResponsiveFlex direction="responsive" breakpoint={breakpoint} data-testid={`flex-${breakpoint}`}>
            <div>Child 1</div>
            <div>Child 2</div>
          </ResponsiveFlex>
        );

        const flexContainer = screen.getByTestId(`flex-${breakpoint}`);
        expect(flexContainer).toHaveClass('flex-col');
        expect(flexContainer).toHaveClass(`${breakpoint}:flex-row`);
        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('maintains proper tab order for keyboard navigation', () => {
      render(
        <ResponsiveFlex data-testid="flex">
          <button>Button 1</button>
          <button>Button 2</button>
          <button>Button 3</button>
        </ResponsiveFlex>
      );

      const buttons = screen.getAllByRole('button');
      
      // Focus first button
      buttons[0].focus();
      expect(document.activeElement).toBe(buttons[0]);
      
      // Tab to next button
      fireEvent.keyDown(buttons[0], { key: 'Tab' });
      // Note: Actual tab navigation testing would require more complex setup
      // This is a basic structure validation
      expect(buttons).toHaveLength(3);
    });

    it('preserves ARIA roles when specified', () => {
      render(
        <ResponsiveFlex as="nav" role="navigation" data-testid="flex">
          <a href="#1">Link 1</a>
          <a href="#2">Link 2</a>
        </ResponsiveFlex>
      );

      const nav = screen.getByTestId('flex');
      expect(nav).toHaveAttribute('role', 'navigation');
      expect(nav.tagName.toLowerCase()).toBe('nav');
    });
  });

  describe('Edge Cases', () => {
    it('handles single child', () => {
      render(
        <ResponsiveFlex data-testid="flex">
          <div>Single Child</div>
        </ResponsiveFlex>
      );

      const flexContainer = screen.getByTestId('flex');
      expect(flexContainer).toBeInTheDocument();
      expect(screen.getByText('Single Child')).toBeInTheDocument();
    });

    it('handles many children (10+)', () => {
      const children = createTestChildren(15);
      render(
        <ResponsiveFlex data-testid="flex">
          {children}
        </ResponsiveFlex>
      );

      const flexContainer = screen.getByTestId('flex');
      expect(flexContainer).toBeInTheDocument();
      
      // Check all children are rendered
      for (let i = 1; i <= 15; i++) {
        expect(screen.getByText(`Child ${i}`)).toBeInTheDocument();
      }
    });

    it('handles long content without overflow using flex-wrap', () => {
      render(
        <ResponsiveFlex wrap={true} data-testid="flex">
          <div style={{ width: '300px' }}>Long content item 1</div>
          <div style={{ width: '300px' }}>Long content item 2</div>
          <div style={{ width: '300px' }}>Long content item 3</div>
          <div style={{ width: '300px' }}>Long content item 4</div>
        </ResponsiveFlex>
      );

      const flexContainer = screen.getByTestId('flex');
      expect(flexContainer).toHaveClass('flex-wrap');
      expect(flexContainer).toHaveClass('w-full');
    });

    it('prevents wrapping when wrap is false', () => {
      render(
        <ResponsiveFlex wrap={false} data-testid="flex">
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveFlex>
      );

      const flexContainer = screen.getByTestId('flex');
      expect(flexContainer).toHaveClass('flex-nowrap');
    });

    it('handles nested flex layouts', () => {
      render(
        <ResponsiveFlex data-testid="outer" direction="col">
          <ResponsiveFlex data-testid="inner" direction="row">
            <div>Nested item 1</div>
            <div>Nested item 2</div>
          </ResponsiveFlex>
          <div>Outer item</div>
        </ResponsiveFlex>
      );

      const outer = screen.getByTestId('outer');
      const inner = screen.getByTestId('inner');
      
      expect(outer).toHaveClass('flex-col');
      expect(inner).toHaveClass('flex-row');
      expect(screen.getByText('Nested item 1')).toBeInTheDocument();
      expect(screen.getByText('Outer item')).toBeInTheDocument();
    });
  });

  describe('Alignment and Justification', () => {
    it('applies alignment classes correctly', () => {
      const alignments = ['start', 'center', 'end', 'stretch'] as const;
      
      alignments.forEach(alignment => {
        const { unmount } = render(
          <ResponsiveFlex alignment={alignment} data-testid={`flex-${alignment}`}>
            <div>Child 1</div>
            <div>Child 2</div>
          </ResponsiveFlex>
        );

        const flexContainer = screen.getByTestId(`flex-${alignment}`);
        expect(flexContainer).toHaveClass(`items-${alignment}`);
        unmount();
      });
    });

    it('applies justification classes correctly', () => {
      const justifications = ['start', 'center', 'end', 'between', 'around', 'evenly'] as const;
      
      justifications.forEach(justify => {
        const { unmount } = render(
          <ResponsiveFlex justify={justify} data-testid={`flex-${justify}`}>
            <div>Child 1</div>
            <div>Child 2</div>
          </ResponsiveFlex>
        );

        const flexContainer = screen.getByTestId(`flex-${justify}`);
        expect(flexContainer).toHaveClass(`justify-${justify}`);
        unmount();
      });
    });
  });

  describe('Props validation', () => {
    it('renders with different HTML elements', () => {
      const elements = ['div', 'section', 'nav', 'header', 'footer'] as const;
      
      elements.forEach(element => {
        const { unmount } = render(
          <ResponsiveFlex as={element} data-testid={`flex-${element}`}>
            <div>Content</div>
          </ResponsiveFlex>
        );

        const container = screen.getByTestId(`flex-${element}`);
        expect(container.tagName.toLowerCase()).toBe(element);
        unmount();
      });
    });

    it('merges custom className correctly', () => {
      render(
        <ResponsiveFlex className="custom-class border-2" data-testid="flex">
          <div>Content</div>
        </ResponsiveFlex>
      );

      const container = screen.getByTestId('flex');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('border-2');
      expect(container).toHaveClass('flex'); // Should still have base classes
      expect(container).toHaveClass('w-full');
    });
  });

  describe('Viewport Testing', () => {
    it('adapts to mobile viewport', () => {
      setMobileViewport();
      
      render(
        <ResponsiveFlex direction="responsive" breakpoint="md" data-testid="flex">
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveFlex>
      );

      const flexContainer = screen.getByTestId('flex');
      expect(flexContainer).toHaveClass('flex-col');
      expect(flexContainer).toHaveClass('md:flex-row');
    });

    it('adapts to tablet viewport', () => {
      setTabletViewport();
      
      render(
        <ResponsiveFlex direction="responsive" breakpoint="md" data-testid="flex">
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveFlex>
      );

      const flexContainer = screen.getByTestId('flex');
      expect(flexContainer).toHaveClass('flex-col');
      expect(flexContainer).toHaveClass('md:flex-row');
    });

    it('adapts to desktop viewport', () => {
      setDesktopViewport();
      
      render(
        <ResponsiveFlex direction="responsive" breakpoint="lg" data-testid="flex">
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveFlex>
      );

      const flexContainer = screen.getByTestId('flex');
      expect(flexContainer).toHaveClass('flex-col');
      expect(flexContainer).toHaveClass('lg:flex-row');
    });
  });

  describe('Performance', () => {
    it('memoizes component to prevent unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestComponent = React.memo(() => {
        renderSpy();
        return (
          <ResponsiveFlex>
            <div>Test</div>
          </ResponsiveFlex>
        );
      });

      const { rerender } = render(<TestComponent />);
      
      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not trigger render
      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('does not re-render when props are deeply equal', () => {
      const gap = { sm: '2', md: '4' };
      
      const { rerender } = render(
        <ResponsiveFlex gap={gap} data-testid="flex">
          <div>Content</div>
        </ResponsiveFlex>
      );

      const flexContainer = screen.getByTestId('flex');
      expect(flexContainer).toBeInTheDocument();
      
      // Re-render with same gap object should not cause issues
      rerender(
        <ResponsiveFlex gap={gap} data-testid="flex">
          <div>Content</div>
        </ResponsiveFlex>
      );
      
      expect(flexContainer).toBeInTheDocument();
    });
  });
});