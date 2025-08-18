import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useScrollIndicator } from '@/hooks/useScrollIndicator';

interface ScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal' | 'both';
  showIndicators?: boolean;
}

export const ScrollContainer = forwardRef<HTMLDivElement, ScrollContainerProps>(
  ({ children, className, orientation = 'vertical', showIndicators = true, ...props }, ref) => {
    const { containerRef, scrollState } = useScrollIndicator();

    return (
      <div
        ref={(node) => {
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
          containerRef.current = node;
        }}
        className={cn(
          'relative',
          // Base scrolling classes
          orientation === 'vertical' && 'overflow-y-auto overflow-x-hidden',
          orientation === 'horizontal' && 'overflow-x-auto overflow-y-hidden',
          orientation === 'both' && 'overflow-auto',
          // Enhanced scrollbar styling
          'scrollbar-styled',
          // Scroll indicators
          showIndicators && scrollState.canScrollUp && 'scroll-indicator-top',
          showIndicators && scrollState.canScrollDown && 'scroll-indicator-bottom',
          showIndicators && scrollState.canScrollLeft && 'scroll-indicator-left',
          showIndicators && scrollState.canScrollRight && 'scroll-indicator-right',
          className
        )}
        {...props}
      >
        {/* Top scroll indicator */}
        {showIndicators && scrollState.canScrollUp && (
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-10" />
        )}
        
        {/* Bottom scroll indicator */}
        {showIndicators && scrollState.canScrollDown && (
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-10" />
        )}
        
        {/* Left scroll indicator */}
        {showIndicators && scrollState.canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none z-10" />
        )}
        
        {/* Right scroll indicator */}
        {showIndicators && scrollState.canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none z-10" />
        )}
        
        {children}
      </div>
    );
  }
);

ScrollContainer.displayName = 'ScrollContainer';