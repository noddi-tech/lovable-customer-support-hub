/**
 * useGlobalKeyboardShortcuts Hook
 * 
 * Provides global keyboard shortcuts for the Voice interface
 * Extends the call-specific shortcuts with navigation and general actions
 */

import { useEffect, useCallback } from 'react';

interface GlobalKeyboardShortcutsConfig {
  onShowHelp?: () => void;
  onFocusSearch?: () => void;
  onRefreshData?: () => void;
  onNavigateDown?: () => void;
  onNavigateUp?: () => void;
  onSelectFirst?: () => void;
  onSelectSecond?: () => void;
  onSelectThird?: () => void;
  isEnabled?: boolean;
}

export const useGlobalKeyboardShortcuts = ({
  onShowHelp,
  onFocusSearch,
  onRefreshData,
  onNavigateDown,
  onNavigateUp,
  onSelectFirst,
  onSelectSecond,
  onSelectThird,
  isEnabled = true,
}: GlobalKeyboardShortcutsConfig) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow some shortcuts even in input fields
      if (event.key === 'Escape') {
        target.blur();
        event.preventDefault();
        return;
      }
      return;
    }

    const key = event.key.toLowerCase();
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;

    // Show help (?)
    if (key === '?' && !event.shiftKey && onShowHelp) {
      event.preventDefault();
      onShowHelp();
      return;
    }

    // Focus search (/)
    if (key === '/' && onFocusSearch) {
      event.preventDefault();
      onFocusSearch();
      return;
    }

    // Refresh data (Ctrl/Cmd + R)
    if (key === 'r' && isCtrlOrCmd && onRefreshData) {
      event.preventDefault();
      onRefreshData();
      return;
    }

    // Navigation shortcuts (J/K vim-style)
    if (key === 'j' && onNavigateDown) {
      event.preventDefault();
      onNavigateDown();
      return;
    }

    if (key === 'k' && onNavigateUp) {
      event.preventDefault();
      onNavigateUp();
      return;
    }

    // Jump to specific items (1-3)
    if (key === '1' && onSelectFirst) {
      event.preventDefault();
      onSelectFirst();
      return;
    }

    if (key === '2' && onSelectSecond) {
      event.preventDefault();
      onSelectSecond();
      return;
    }

    if (key === '3' && onSelectThird) {
      event.preventDefault();
      onSelectThird();
      return;
    }
  }, [
    isEnabled,
    onShowHelp,
    onFocusSearch,
    onRefreshData,
    onNavigateDown,
    onNavigateUp,
    onSelectFirst,
    onSelectSecond,
    onSelectThird,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    showHelp: onShowHelp,
  };
};
