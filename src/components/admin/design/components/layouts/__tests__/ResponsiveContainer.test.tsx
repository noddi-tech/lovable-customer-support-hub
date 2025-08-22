import React from 'react';
import { screen } from '@testing-library/react';
import { ResponsiveContainer } from '../ResponsiveContainer';
import { render, createTestChildren, setMobileViewport, setTabletViewport, setDesktopViewport } from './test-utils-layouts';

describe('ResponsiveContainer', () => {
  beforeEach(() => {
    setDesktopViewport();
  });

  describe('Responsiveness', () => {
    it('applies correct padding breakpoints', () => {
      const responsivePadding = { sm: '2', md: '4', lg: '6' };
      render(
        <ResponsiveContainer padding={responsivePadding} data-testid="container">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('sm:p-2');
      expect(container).toHaveClass('md:p-4');
      expect(container).toHaveClass('lg:p-6');
    });

    it('applies single padding value', () => {
      render(
        <ResponsiveContainer padding="8" data-testid="container">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('p-8');
    });

    it('applies correct maxWidth variants', () => {
      const testCases = [
        { maxWidth: 'sm' as const, expected: 'max-w-sm' },
        { maxWidth: 'md' as const, expected: 'max-w-md' },
        { maxWidth: 'lg' as const, expected: 'max-w-lg' },
        { maxWidth: 'xl' as const, expected: 'max-w-xl' },
        { maxWidth: '2xl' as const, expected: 'max-w-2xl' },
        { maxWidth: '4xl' as const, expected: 'max-w-4xl' },
        { maxWidth: '7xl' as const, expected: 'max-w-7xl' },
        { maxWidth: 'full' as const, expected: 'w-full' },
      ];

      testCases.forEach(({ maxWidth, expected }) => {
        const { unmount } = render(
          <ResponsiveContainer maxWidth={maxWidth} data-testid={`container-${maxWidth}`}>
            <div>Content</div>
          </ResponsiveContainer>
        );

        const container = screen.getByTestId(`container-${maxWidth}`);
        expect(container).toHaveClass(expected);
        unmount();
      });
    });

    it('centers container when center prop is true', () => {
      render(
        <ResponsiveContainer center={true} data-testid="container">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('mx-auto');
    });

    it('does not center container when center prop is false', () => {
      render(
        <ResponsiveContainer center={false} data-testid="container">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).not.toHaveClass('mx-auto');
    });
  });

  describe('Edge Cases', () => {
    it('handles single child', () => {
      render(
        <ResponsiveContainer data-testid="container">
          <div>Single Child</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();
      expect(screen.getByText('Single Child')).toBeInTheDocument();
    });

    it('handles multiple children', () => {
      const children = createTestChildren(10);
      render(
        <ResponsiveContainer data-testid="container">
          {children}
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();
      
      // Check all children are rendered
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`Child ${i}`)).toBeInTheDocument();
      }
    });

    it('handles long content without overflow', () => {
      const longContent = 'A'.repeat(1000);
      render(
        <ResponsiveContainer data-testid="container">
          <div>{longContent}</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('w-full');
      expect(container).toBeInTheDocument();
    });

    it('handles nested containers', () => {
      render(
        <ResponsiveContainer data-testid="outer" maxWidth="lg">
          <ResponsiveContainer data-testid="inner" maxWidth="md">
            <div>Nested content</div>
          </ResponsiveContainer>
        </ResponsiveContainer>
      );

      const outer = screen.getByTestId('outer');
      const inner = screen.getByTestId('inner');
      
      expect(outer).toHaveClass('max-w-lg');
      expect(inner).toHaveClass('max-w-md');
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });

  describe('Props validation', () => {
    it('renders with different HTML elements', () => {
      const elements = ['div', 'section', 'main', 'article'] as const;
      
      elements.forEach(element => {
        const { unmount } = render(
          <ResponsiveContainer as={element} data-testid={`container-${element}`}>
            <div>Content</div>
          </ResponsiveContainer>
        );

        const container = screen.getByTestId(`container-${element}`);
        expect(container.tagName.toLowerCase()).toBe(element);
        unmount();
      });
    });

    it('merges custom className correctly', () => {
      render(
        <ResponsiveContainer className="custom-class border-2" data-testid="container">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('border-2');
      expect(container).toHaveClass('w-full'); // Should still have base classes
    });
  });

  describe('Viewport Testing', () => {
    it('behaves consistently across viewport sizes', () => {
      const testViewports = [setMobileViewport, setTabletViewport, setDesktopViewport];
      
      testViewports.forEach((setViewport, index) => {
        setViewport();
        
        const { unmount } = render(
          <ResponsiveContainer data-testid={`container-${index}`}>
            <div>Content</div>
          </ResponsiveContainer>
        );

        const container = screen.getByTestId(`container-${index}`);
        expect(container).toHaveClass('w-full');
        expect(container).toHaveClass('max-w-7xl'); // default maxWidth
        expect(container).toHaveClass('mx-auto'); // default center
        
        unmount();
      });
    });
  });

  describe('Performance', () => {
    it('memoizes component to prevent unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestComponent = React.memo(() => {
        renderSpy();
        return (
          <ResponsiveContainer>
            <div>Test</div>
          </ResponsiveContainer>
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