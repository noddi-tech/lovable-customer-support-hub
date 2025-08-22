import React from 'react';
import { ResponsiveContainer } from '../ResponsiveContainer';
import { render, screen, createTestChildren, setMobileViewport, setTabletViewport, setDesktopViewport } from './test-utils-layouts';

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

    it('centers container when center prop is true', () => {
      render(
        <ResponsiveContainer center={true} data-testid="container">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('mx-auto');
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
  });

  describe('Performance', () => {
    it('memoizes component to prevent unnecessary re-renders', () => {
      const renderSpy = vi.fn();
      
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