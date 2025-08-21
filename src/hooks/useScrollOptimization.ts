import { useEffect, useRef, useCallback } from 'react';
import throttle from 'lodash.throttle';
import debounce from 'lodash.debounce';

interface ScrollOptimizationOptions {
  throttleMs?: number;
  debounceMs?: number;
  rootMargin?: string;
  threshold?: number | number[];
  enableIntersectionObserver?: boolean;
}

export const useScrollOptimization = (
  onScroll?: (event: Event) => void,
  onScrollEnd?: () => void,
  options: ScrollOptimizationOptions = {}
) => {
  const {
    throttleMs = 16, // ~60fps
    debounceMs = 150,
    rootMargin = '50px',
    threshold = 0.1,
    enableIntersectionObserver = true,
  } = options;

  const scrollElementRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibleItemsRef = useRef<Set<string>>(new Set());

  // Throttled scroll handler for smooth performance
  const throttledScrollHandler = useCallback(
    throttle((event: Event) => {
      if (onScroll) {
        onScroll(event);
      }
    }, throttleMs),
    [onScroll, throttleMs]
  );

  // Debounced scroll end handler
  const debouncedScrollEndHandler = useCallback(
    debounce(() => {
      if (onScrollEnd) {
        onScrollEnd();
      }
    }, debounceMs),
    [onScrollEnd, debounceMs]
  );

  // Combined scroll handler
  const handleScroll = useCallback((event: Event) => {
    throttledScrollHandler(event);
    debouncedScrollEndHandler();
  }, [throttledScrollHandler, debouncedScrollEndHandler]);

  // Set up scroll listeners
  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
      throttledScrollHandler.cancel();
      debouncedScrollEndHandler.cancel();
    };
  }, [handleScroll, throttledScrollHandler, debouncedScrollEndHandler]);

  // Intersection Observer for lazy loading and visibility tracking
  useEffect(() => {
    if (!enableIntersectionObserver) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const itemId = entry.target.getAttribute('data-item-id');
          if (!itemId) return;

          if (entry.isIntersecting) {
            visibleItemsRef.current.add(itemId);
            // Trigger lazy loading or other optimizations
            entry.target.setAttribute('data-visible', 'true');
          } else {
            visibleItemsRef.current.delete(itemId);
            entry.target.setAttribute('data-visible', 'false');
          }
        });
      },
      {
        root: scrollElementRef.current,
        rootMargin,
        threshold,
      }
    );

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enableIntersectionObserver, rootMargin, threshold]);

  // Method to observe an element
  const observeElement = useCallback((element: HTMLElement) => {
    if (observerRef.current && element) {
      observerRef.current.observe(element);
    }
  }, []);

  // Method to unobserve an element
  const unobserveElement = useCallback((element: HTMLElement) => {
    if (observerRef.current && element) {
      observerRef.current.unobserve(element);
    }
  }, []);

  // Get currently visible items
  const getVisibleItems = useCallback(() => {
    return Array.from(visibleItemsRef.current);
  }, []);

  // Smooth scroll to element
  const scrollToElement = useCallback((
    elementId: string, 
    behavior: ScrollBehavior = 'smooth'
  ) => {
    const element = scrollElementRef.current;
    if (!element) return;

    const targetElement = element.querySelector(`[data-item-id="${elementId}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({ 
        behavior, 
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, []);

  // Scroll to top with optimization
  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const element = scrollElementRef.current;
    if (element) {
      element.scrollTo({ top: 0, behavior });
    }
  }, []);

  // Scroll to bottom with optimization
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const element = scrollElementRef.current;
    if (element) {
      element.scrollTo({ top: element.scrollHeight, behavior });
    }
  }, []);

  // Check if element is in view
  const isElementInView = useCallback((elementId: string) => {
    return visibleItemsRef.current.has(elementId);
  }, []);

  return {
    scrollElementRef,
    observeElement,
    unobserveElement,
    getVisibleItems,
    scrollToElement,
    scrollToTop,
    scrollToBottom,
    isElementInView,
    // Cleanup methods
    cleanup: () => {
      throttledScrollHandler.cancel();
      debouncedScrollEndHandler.cancel();
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    },
  };
};