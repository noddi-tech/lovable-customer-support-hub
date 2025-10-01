/**
 * useCallKeyboardShortcuts Hook
 * 
 * Provides keyboard shortcuts for power users during calls
 * Shortcuts are only active when a call is in progress
 */

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface KeyboardShortcutsConfig {
  onAnswer?: () => void;
  onHangUp?: () => void;
  onMute?: () => void;
  onHold?: () => void;
  onTransfer?: () => void;
  onAddNote?: () => void;
  isCallActive: boolean;
}

export const useCallKeyboardShortcuts = ({
  onAnswer,
  onHangUp,
  onMute,
  onHold,
  onTransfer,
  onAddNote,
  isCallActive,
}: KeyboardShortcutsConfig) => {
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only process shortcuts when Ctrl/Cmd + Shift are pressed
      const isShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey;
      
      if (!isShortcut) return;

      // Prevent default browser behavior for our shortcuts
      const shortcutKey = event.key.toLowerCase();

      switch (shortcutKey) {
        case 'a':
          if (onAnswer) {
            event.preventDefault();
            onAnswer();
            toast({
              title: 'Call answered',
              description: 'Keyboard shortcut: Ctrl+Shift+A',
              duration: 2000,
            });
          }
          break;

        case 'h':
          if (onHangUp && isCallActive) {
            event.preventDefault();
            onHangUp();
            toast({
              title: 'Call ended',
              description: 'Keyboard shortcut: Ctrl+Shift+H',
              duration: 2000,
            });
          }
          break;

        case 'm':
          if (onMute && isCallActive) {
            event.preventDefault();
            onMute();
            toast({
              title: 'Mute toggled',
              description: 'Keyboard shortcut: Ctrl+Shift+M',
              duration: 2000,
            });
          }
          break;

        case 'p':
          if (onHold && isCallActive) {
            event.preventDefault();
            onHold();
            toast({
              title: 'Hold toggled',
              description: 'Keyboard shortcut: Ctrl+Shift+P',
              duration: 2000,
            });
          }
          break;

        case 't':
          if (onTransfer && isCallActive) {
            event.preventDefault();
            onTransfer();
            toast({
              title: 'Transfer initiated',
              description: 'Keyboard shortcut: Ctrl+Shift+T',
              duration: 2000,
            });
          }
          break;

        case 'n':
          if (onAddNote && isCallActive) {
            event.preventDefault();
            onAddNote();
            toast({
              title: 'Note editor opened',
              description: 'Keyboard shortcut: Ctrl+Shift+N',
              duration: 2000,
            });
          }
          break;

        case '?':
          event.preventDefault();
          showShortcutsHelp();
          break;
      }
    };

    const showShortcutsHelp = () => {
      toast({
        title: 'Keyboard Shortcuts',
        description: (
          <div className="space-y-1 text-xs">
            <p><kbd>Ctrl+Shift+A</kbd> - Answer call</p>
            <p><kbd>Ctrl+Shift+H</kbd> - Hang up</p>
            <p><kbd>Ctrl+Shift+M</kbd> - Toggle mute</p>
            <p><kbd>Ctrl+Shift+P</kbd> - Toggle hold</p>
            <p><kbd>Ctrl+Shift+T</kbd> - Transfer call</p>
            <p><kbd>Ctrl+Shift+N</kbd> - Add note</p>
            <p><kbd>Ctrl+Shift+?</kbd> - Show this help</p>
          </div>
        ),
        duration: 8000,
      });
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onAnswer, onHangUp, onMute, onHold, onTransfer, onAddNote, isCallActive, toast]);

  return {
    showHelp: () => {
      toast({
        title: 'Keyboard Shortcuts',
        description: (
          <div className="space-y-1 text-xs">
            <p><kbd>Ctrl+Shift+A</kbd> - Answer call</p>
            <p><kbd>Ctrl+Shift+H</kbd> - Hang up</p>
            <p><kbd>Ctrl+Shift+M</kbd> - Toggle mute</p>
            <p><kbd>Ctrl+Shift+P</kbd> - Toggle hold</p>
            <p><kbd>Ctrl+Shift+T</kbd> - Transfer call</p>
            <p><kbd>Ctrl+Shift+N</kbd> - Add note</p>
          </div>
        ),
        duration: 8000,
      });
    },
  };
};
