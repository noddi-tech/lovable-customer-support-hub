import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // If another handler already consumed this event, skip
      if (event.defaultPrevented) return;

      // Check each shortcut
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          // For Escape: don't fire if any Radix dialog/overlay/popover is open
          if (shortcut.key.toLowerCase() === 'escape') {
            const hasOpenModal = document.querySelector(
              '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], ' +
              '[data-radix-dialog-overlay], [data-radix-popover-content], ' +
              '[data-radix-dropdown-menu-content], [data-radix-select-content]'
            );
            if (hasOpenModal) return;
          }

          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

// Common shortcuts preset
export const useCommonShortcuts = (callbacks: {
  onSearch?: () => void;
  onRefresh?: () => void;
  onEscape?: () => void;
  onHelp?: () => void;
}) => {
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      action: () => callbacks.onSearch?.(),
      description: 'Search conversations',
    },
    {
      key: 'r',
      ctrl: true,
      action: () => callbacks.onRefresh?.(),
      description: 'Refresh',
    },
    {
      key: 'Escape',
      action: () => callbacks.onEscape?.(),
      description: 'Close/Cancel',
    },
    {
      key: '?',
      shift: true,
      action: () => callbacks.onHelp?.(),
      description: 'Show shortcuts',
    },
  ]);
};
