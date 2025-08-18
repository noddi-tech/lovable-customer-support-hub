import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavigation {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSelect: () => void;
  onEscape: () => void;
  enabled?: boolean;
}

interface UseKeyboardNavigationOptions {
  navigation: KeyboardNavigation;
  containerRef?: React.RefObject<HTMLElement>;
}

export const useKeyboardNavigation = ({ 
  navigation, 
  containerRef 
}: UseKeyboardNavigationOptions) => {
  const { onMoveUp, onMoveDown, onSelect, onEscape, enabled = true } = navigation;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Check if we're inside an input, textarea, or contenteditable
    const target = event.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true' ||
                          target.closest('[contenteditable="true"]');

    if (isInputElement) return;

    switch (event.key) {
      case 'ArrowUp':
      case 'k':
      case 'K':
        event.preventDefault();
        onMoveUp();
        break;
      case 'ArrowDown':
      case 'j':
      case 'J':
        event.preventDefault();
        onMoveDown();
        break;
      case 'Enter':
        event.preventDefault();
        onSelect();
        break;
      case 'Escape':
        event.preventDefault();
        onEscape();
        break;
    }
  }, [enabled, onMoveUp, onMoveDown, onSelect, onEscape]);

  useEffect(() => {
    const container = containerRef?.current || document;
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, containerRef]);

  return {
    // Helper to focus specific elements
    focusElement: (selector: string) => {
      const element = containerRef?.current?.querySelector(selector) as HTMLElement;
      element?.focus();
    }
  };
};