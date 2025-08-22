import React from 'react';
import { ResponsiveFlex } from '../ResponsiveFlex';
import { render, screen, fireEvent, createTestChildren, setMobileViewport, setTabletViewport, setDesktopViewport } from './test-utils-layouts';

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

      const flex = screen.getByTestId('flex');
      expect(flex).toHaveClass('flex-col');
      expect(flex).toHaveClass('md:flex-row');
    });

    it('applies fixed directions correctly', () => {
      const { rerender } = render(
        <ResponsiveFlex direction="row" data-testid="flex">
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveFlex>
      );

      let flex = screen.getByTestId('flex');
      expect(flex).toHaveClass('flex-row');

      rerender(
        <ResponsiveFlex direction="col" data-testid="flex">
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveFlex>
      );

      flex = screen.getByTestId('flex');
      expect(flex).toHaveClass('flex-col');
    });

    it('applies responsive gap correctly', () => {
      const responsiveGap = { sm: '2', md: '4', lg: '6' };
      render(
        <ResponsiveFlex gap={responsiveGap} data-testid="flex">
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveFlex>
      );

      const flex = screen.getByTestId('flex');
      expect(flex).toHaveClass('sm:gap-2');
      expect(flex).toHaveClass('md:gap-4');
      expect(flex).toHaveClass('lg:gap-6');
    });
  });

  describe('Accessibility', () => {
    it('preserves ARIA roles', () => {
      render(
        <ResponsiveFlex as="nav" data-testid="flex">
          <div>Nav item 1</div>
          <div>Nav item 2</div>
        </ResponsiveFlex>
      );

      const nav = screen.getByTestId('flex');
      expect(nav.tagName.toLowerCase()).toBe('nav');
      expect(nav).not.toHaveAttribute('role');
    });
  });

  describe('Edge Cases', () => {
    it('handles single child', () => {
      render(
        <ResponsiveFlex data-testid="flex">
          <div>Single Child</div>
        </ResponsiveFlex>
      );

      const flex = screen.getByTestId('flex');
      expect(flex).toBeInTheDocument();
      expect(screen.getByText('Single Child')).toBeInTheDocument();
    });

    it('handles many children', () => {
      const children = createTestChildren(20);
      render(
        <ResponsiveFlex data-testid="flex">
          {children}
        </ResponsiveFlex>
      );

      const flex = screen.getByTestId('flex');
      expect(flex).toBeInTheDocument();
      
      // Check all children are rendered
      for (let i = 1; i <= 20; i++) {
        expect(screen.getByText(`Child ${i}`)).toBeInTheDocument();
      }
    });

    it('applies flex-wrap when wrap is enabled', () => {
      render(
        <ResponsiveFlex wrap={true} data-testid="flex">
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveFlex>
      );

      const flex = screen.getByTestId('flex');
      expect(flex).toHaveClass('flex-wrap');
    });
  });

  describe('Performance', () => {
    it('memoizes component to prevent unnecessary re-renders', () => {
      const renderSpy = vi.fn();
      
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
  });
});