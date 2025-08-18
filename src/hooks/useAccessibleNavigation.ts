import { useEffect } from 'react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useAriaAnnouncement } from '@/hooks/useAriaAnnouncement';

interface UseAccessibleNavigationOptions {
  enabled?: boolean;
  onShowShortcuts?: () => void;
  onToggleInspector?: () => void;
  onNavigateToSection?: (section: 'interactions' | 'marketing' | 'ops') => void;
}

export const useAccessibleNavigation = (options: UseAccessibleNavigationOptions = {}) => {
  const { 
    enabled = true, 
    onShowShortcuts, 
    onToggleInspector,
    onNavigateToSection 
  } = options;
  const { announce } = useAriaAnnouncement();

  useEffect(() => {
    if (!enabled) return;

    const handleGlobalKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.contentEditable === 'true';

      if (isInputElement) return;

      // Global shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '/':
            event.preventDefault();
            onShowShortcuts?.();
            announce('Keyboard shortcuts help opened');
            break;
          case 'k':
            event.preventDefault();
            announce('Command palette opened');
            // TODO: Implement command palette
            break;
          case '\\':
            event.preventDefault();
            onToggleInspector?.();
            announce('Toggled inspector panel');
            break;
        }
      }

      // Alt + number shortcuts for navigation
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            onNavigateToSection?.('interactions');
            announce('Navigated to Interactions');
            break;
          case '2':
            event.preventDefault();
            onNavigateToSection?.('marketing');
            announce('Navigated to Marketing');
            break;
          case '3':
            event.preventDefault();
            onNavigateToSection?.('ops');
            announce('Navigated to Operations');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeydown);
    return () => document.removeEventListener('keydown', handleGlobalKeydown);
  }, [enabled, onShowShortcuts, onToggleInspector, onNavigateToSection, announce]);

  return {
    announce
  };
};