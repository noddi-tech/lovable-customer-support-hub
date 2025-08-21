import { useEffect, useRef, useCallback } from 'react';

interface FocusManagementOptions {
  trapFocus?: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
}

export const useFocusManagement = (
  isOpen: boolean,
  options: FocusManagementOptions = {}
) => {
  const {
    trapFocus = true,
    restoreFocus = true,
    autoFocus = true,
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Get all focusable elements within container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    return elements.filter(
      element => 
        element.offsetWidth > 0 && 
        element.offsetHeight > 0 && 
        !element.hidden
    );
  }, []);

  // Handle tab key for focus trapping
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!trapFocus || !isOpen || event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab (forward)
      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [trapFocus, isOpen, getFocusableElements]);

  // Handle Escape key
  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (isOpen && event.key === 'Escape') {
      event.preventDefault();
      if (restoreFocus && previousActiveElement.current) {
        (previousActiveElement.current as HTMLElement).focus();
      }
    }
  }, [isOpen, restoreFocus]);

  // Set up event listeners
  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleKeyDown, handleEscape]);

  // Handle focus on open/close
  useEffect(() => {
    if (isOpen) {
      // Store the previously active element
      previousActiveElement.current = document.activeElement;

      // Auto-focus the first focusable element
      if (autoFocus) {
        setTimeout(() => {
          const focusableElements = getFocusableElements();
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          } else if (containerRef.current) {
            containerRef.current.focus();
          }
        }, 0);
      }
    } else {
      // Restore focus when closing
      if (restoreFocus && previousActiveElement.current) {
        setTimeout(() => {
          (previousActiveElement.current as HTMLElement).focus();
          previousActiveElement.current = null;
        }, 0);
      }
    }
  }, [isOpen, autoFocus, restoreFocus, getFocusableElements]);

  // Focus management utilities
  const focusFirst = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements]);

  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, [getFocusableElements]);

  return {
    containerRef,
    focusFirst,
    focusLast,
    getFocusableElements,
  };
};

// Hook for managing focus within a specific element
export const useFocusTrap = (isActive: boolean) => {
  return useFocusManagement(isActive, {
    trapFocus: true,
    restoreFocus: true,
    autoFocus: true,
  });
};

// Hook for managing focus restoration without trapping
export const useFocusRestore = (isActive: boolean) => {
  return useFocusManagement(isActive, {
    trapFocus: false,
    restoreFocus: true,
    autoFocus: false,
  });
};