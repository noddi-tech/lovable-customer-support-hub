import { useEffect, useRef, useState } from 'react';

interface ScrollIndicatorState {
  canScrollUp: boolean;
  canScrollDown: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

export const useScrollIndicator = () => {
  const containerRef = useRef<HTMLElement>(null);
  const [scrollState, setScrollState] = useState<ScrollIndicatorState>({
    canScrollUp: false,
    canScrollDown: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScrollState = () => {
      const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = container;
      
      setScrollState({
        canScrollUp: scrollTop > 0,
        canScrollDown: scrollTop < scrollHeight - clientHeight - 1,
        canScrollLeft: scrollLeft > 0,
        canScrollRight: scrollLeft < scrollWidth - clientWidth - 1,
      });
    };

    // Initial check
    updateScrollState();

    // Listen for scroll events
    container.addEventListener('scroll', updateScrollState, { passive: true });
    
    // Listen for resize events
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, []);

  return { containerRef, scrollState };
};