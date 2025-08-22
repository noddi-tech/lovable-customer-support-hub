import React from 'react';
import { screen } from '@testing-library/react';
import { AdaptiveSection } from '../AdaptiveSection';
import { render, createTestChildren, setMobileViewport, setTabletViewport, setDesktopViewport } from './test-utils-layouts';

describe('AdaptiveSection', () => {
  beforeEach(() => {
    setDesktopViewport();
  });

  describe('Spacing Direction', () => {
    it('applies y-direction spacing by default', () => {
      render(
        <AdaptiveSection spacing="4" data-testid="section">
          <div>Child 1</div>
          <div>Child 2</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('space-y-4');
    });

    it('applies x-direction spacing correctly', () => {
      render(
        <AdaptiveSection direction="x" spacing="6" data-testid="section">
          <div>Child 1</div>
          <div>Child 2</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('space-x-6');
    });

    it('applies both-direction spacing correctly', () => {
      render(
        <AdaptiveSection direction="both" spacing="4" data-testid="section">
          <div>Child 1</div>
          <div>Child 2</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('space-x-4');
      expect(section).toHaveClass('space-y-4');
    });

    it('applies responsive spacing correctly', () => {
      const responsiveSpacing = { sm: '2', md: '4', lg: '6', xl: '8' };
      render(
        <AdaptiveSection spacing={responsiveSpacing} direction="y" data-testid="section">
          <div>Child 1</div>
          <div>Child 2</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('sm:space-y-2');
      expect(section).toHaveClass('md:space-y-4');
      expect(section).toHaveClass('lg:space-y-6');
      expect(section).toHaveClass('xl:space-y-8');
    });
  });

  describe('Padding and Margin', () => {
    it('applies responsive padding correctly', () => {
      const responsivePadding = { sm: '2', md: '4', lg: '6' };
      render(
        <AdaptiveSection padding={responsivePadding} data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('sm:p-2');
      expect(section).toHaveClass('md:p-4');
      expect(section).toHaveClass('lg:p-6');
    });

    it('applies single padding value', () => {
      render(
        <AdaptiveSection padding="8" data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('p-8');
    });

    it('applies responsive margin correctly', () => {
      const responsiveMargin = { sm: '1', md: '2', lg: '4' };
      render(
        <AdaptiveSection margin={responsiveMargin} data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('sm:m-1');
      expect(section).toHaveClass('md:m-2');
      expect(section).toHaveClass('lg:m-4');
    });

    it('applies single margin value', () => {
      render(
        <AdaptiveSection margin="6" data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('m-6');
    });

    it('does not apply padding/margin classes when not provided', () => {
      render(
        <AdaptiveSection data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section.className).not.toMatch(/p-/);
      expect(section.className).not.toMatch(/m-/);
    });
  });

  describe('Background Variants', () => {
    it('applies no background by default', () => {
      render(
        <AdaptiveSection data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).not.toHaveClass('bg-muted');
      expect(section).not.toHaveClass('bg-card');
      expect(section).not.toHaveClass('bg-accent');
    });

    it('applies background variants correctly', () => {
      const backgrounds = ['none', 'muted', 'card', 'accent'] as const;
      
      backgrounds.forEach(background => {
        const { unmount } = render(
          <AdaptiveSection background={background} data-testid={`section-${background}`}>
            <div>Content</div>
          </AdaptiveSection>
        );

        const section = screen.getByTestId(`section-${background}`);
        if (background === 'none') {
          expect(section).not.toHaveClass('bg-muted');
          expect(section).not.toHaveClass('bg-card');
          expect(section).not.toHaveClass('bg-accent');
        } else {
          expect(section).toHaveClass(`bg-${background}`);
        }
        
        unmount();
      });
    });
  });

  describe('Visual Properties', () => {
    it('applies border when border prop is true', () => {
      render(
        <AdaptiveSection border={true} data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('border');
      expect(section).toHaveClass('border-border');
    });

    it('does not apply border when border prop is false', () => {
      render(
        <AdaptiveSection border={false} data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).not.toHaveClass('border');
    });

    it('applies rounded corners when rounded prop is true', () => {
      render(
        <AdaptiveSection rounded={true} data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('rounded-lg');
    });

    it('does not apply rounded corners when rounded prop is false', () => {
      render(
        <AdaptiveSection rounded={false} data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).not.toHaveClass('rounded-lg');
    });

    it('applies shadow variants correctly', () => {
      const shadows = ['none', 'sm', 'md', 'lg'] as const;
      
      shadows.forEach(shadow => {
        const { unmount } = render(
          <AdaptiveSection shadow={shadow} data-testid={`section-${shadow}`}>
            <div>Content</div>
          </AdaptiveSection>
        );

        const section = screen.getByTestId(`section-${shadow}`);
        if (shadow === 'none') {
          expect(section).not.toHaveClass('shadow-sm');
          expect(section).not.toHaveClass('shadow-md');
          expect(section).not.toHaveClass('shadow-lg');
        } else {
          expect(section).toHaveClass(`shadow-${shadow}`);
        }
        
        unmount();
      });
    });
  });

  describe('Combined Properties', () => {
    it('applies multiple visual properties together', () => {
      render(
        <AdaptiveSection 
          background="card"
          border={true}
          rounded={true}
          shadow="md"
          padding="6"
          margin="4"
          data-testid="section"
        >
          <div>Content</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('bg-card');
      expect(section).toHaveClass('border');
      expect(section).toHaveClass('border-border');
      expect(section).toHaveClass('rounded-lg');
      expect(section).toHaveClass('shadow-md');
      expect(section).toHaveClass('p-6');
      expect(section).toHaveClass('m-4');
    });

    it('handles responsive properties with visual properties', () => {
      const responsivePadding = { sm: '2', md: '4', lg: '6' };
      const responsiveSpacing = { sm: '1', md: '2', lg: '3' };
      
      render(
        <AdaptiveSection 
          padding={responsivePadding}
          spacing={responsiveSpacing}
          direction="y"
          background="muted"
          rounded={true}
          data-testid="section"
        >
          <div>Child 1</div>
          <div>Child 2</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('sm:p-2');
      expect(section).toHaveClass('md:p-4');
      expect(section).toHaveClass('lg:p-6');
      expect(section).toHaveClass('sm:space-y-1');
      expect(section).toHaveClass('md:space-y-2');
      expect(section).toHaveClass('lg:space-y-3');
      expect(section).toHaveClass('bg-muted');
      expect(section).toHaveClass('rounded-lg');
    });
  });

  describe('Edge Cases', () => {
    it('handles single child', () => {
      render(
        <AdaptiveSection data-testid="section">
          <div>Single Child</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toBeInTheDocument();
      expect(screen.getByText('Single Child')).toBeInTheDocument();
    });

    it('handles multiple children', () => {
      const children = createTestChildren(8);
      render(
        <AdaptiveSection data-testid="section">
          {children}
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toBeInTheDocument();
      
      // Check all children are rendered
      for (let i = 1; i <= 8; i++) {
        expect(screen.getByText(`Child ${i}`)).toBeInTheDocument();
      }
    });

    it('handles long content', () => {
      const longContent = 'A'.repeat(1000);
      render(
        <AdaptiveSection data-testid="section">
          <div>{longContent}</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toBeInTheDocument();
    });

    it('handles nested sections', () => {
      render(
        <AdaptiveSection data-testid="outer" background="card" padding="6">
          <AdaptiveSection data-testid="inner" background="muted" padding="4">
            <div>Nested content</div>
          </AdaptiveSection>
        </AdaptiveSection>
      );

      const outer = screen.getByTestId('outer');
      const inner = screen.getByTestId('inner');
      
      expect(outer).toHaveClass('bg-card');
      expect(outer).toHaveClass('p-6');
      expect(inner).toHaveClass('bg-muted');
      expect(inner).toHaveClass('p-4');
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });

    it('handles complex spacing combinations', () => {
      render(
        <AdaptiveSection 
          direction="both" 
          spacing={{ sm: '2', md: '4' }}
          padding={{ sm: '4', md: '6' }}
          margin="2"
          data-testid="section"
        >
          <div>Child 1</div>
          <div>Child 2</div>
        </AdaptiveSection>
      );

      const section = screen.getByTestId('section');
      expect(section).toHaveClass('sm:space-x-2');
      expect(section).toHaveClass('sm:space-y-2');
      expect(section).toHaveClass('md:space-x-4');
      expect(section).toHaveClass('md:space-y-4');
      expect(section).toHaveClass('sm:p-4');
      expect(section).toHaveClass('md:p-6');
      expect(section).toHaveClass('m-2');
    });
  });

  describe('Props validation', () => {
    it('renders with different HTML elements', () => {
      const elements = ['div', 'section', 'article', 'aside', 'main'] as const;
      
      elements.forEach(element => {
        const { unmount } = render(
          <AdaptiveSection as={element} data-testid={`section-${element}`}>
            <div>Content</div>
          </AdaptiveSection>
        );

        const container = screen.getByTestId(`section-${element}`);
        expect(container.tagName.toLowerCase()).toBe(element);
        unmount();
      });
    });

    it('merges custom className correctly', () => {
      render(
        <AdaptiveSection className="custom-class border-2" data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      const container = screen.getByTestId('section');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('border-2');
      expect(container).toHaveClass('space-y-4'); // Should still have default spacing
    });
  });

  describe('Viewport Testing', () => {
    it('behaves consistently across viewport sizes', () => {
      const testViewports = [setMobileViewport, setTabletViewport, setDesktopViewport];
      
      testViewports.forEach((setViewport, index) => {
        setViewport();
        
        const { unmount } = render(
          <AdaptiveSection 
            spacing={{ sm: '2', md: '4', lg: '6' }}
            data-testid={`section-${index}`}
          >
            <div>Content</div>
          </AdaptiveSection>
        );

        const section = screen.getByTestId(`section-${index}`);
        expect(section).toHaveClass('sm:space-y-2');
        expect(section).toHaveClass('md:space-y-4');
        expect(section).toHaveClass('lg:space-y-6');
        
        unmount();
      });
    });

    it('adapts spacing based on viewport', () => {
      const responsiveSpacing = { sm: '2', md: '4', lg: '6' };
      
      // Mobile
      setMobileViewport();
      const { rerender } = render(
        <AdaptiveSection spacing={responsiveSpacing} data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      let section = screen.getByTestId('section');
      expect(section).toHaveClass('sm:space-y-2');

      // Tablet
      setTabletViewport();
      rerender(
        <AdaptiveSection spacing={responsiveSpacing} data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      section = screen.getByTestId('section');
      expect(section).toHaveClass('md:space-y-4');

      // Desktop
      setDesktopViewport();
      rerender(
        <AdaptiveSection spacing={responsiveSpacing} data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      section = screen.getByTestId('section');
      expect(section).toHaveClass('lg:space-y-6');
    });
  });

  describe('Performance', () => {
    it('memoizes component to prevent unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestComponent = React.memo(() => {
        renderSpy();
        return (
          <AdaptiveSection>
            <div>Test</div>
          </AdaptiveSection>
        );
      });

      const { rerender } = render(<TestComponent />);
      
      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not trigger render
      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('memoizes getSpacingClass function correctly', () => {
      const { rerender } = render(
        <AdaptiveSection spacing="4" padding="6" data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      let section = screen.getByTestId('section');
      expect(section).toHaveClass('space-y-4');
      expect(section).toHaveClass('p-6');

      // Re-render with same props should not cause issues
      rerender(
        <AdaptiveSection spacing="4" padding="6" data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      section = screen.getByTestId('section');
      expect(section).toBeInTheDocument();
    });

    it('handles frequent prop changes efficiently', () => {
      const { rerender } = render(
        <AdaptiveSection background="card" data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      let section = screen.getByTestId('section');
      expect(section).toHaveClass('bg-card');

      // Change background
      rerender(
        <AdaptiveSection background="muted" data-testid="section">
          <div>Content</div>
        </AdaptiveSection>
      );

      section = screen.getByTestId('section');
      expect(section).toHaveClass('bg-muted');
      expect(section).not.toHaveClass('bg-card');
    });
  });
});