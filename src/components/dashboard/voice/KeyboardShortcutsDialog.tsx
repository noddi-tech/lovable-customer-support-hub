import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const shortcuts = [
    {
      category: 'Call Actions',
      items: [
        { keys: ['Space', 'Enter'], description: 'Answer ringing call' },
        { keys: ['Esc'], description: 'Dismiss modal / Close sidebar' },
        { keys: ['Ctrl', 'Shift', 'H'], description: 'Hang up active call' },
        { keys: ['Ctrl', 'Shift', 'M'], description: 'Toggle mute' },
        { keys: ['Ctrl', 'Shift', 'P'], description: 'Toggle hold' },
        { keys: ['Ctrl', 'Shift', 'N'], description: 'Add quick note' },
        { keys: ['Ctrl', 'Shift', 'T'], description: 'Transfer call' },
      ],
    },
    {
      category: 'Navigation',
      items: [
        { keys: ['J'], description: 'Navigate down in list' },
        { keys: ['K'], description: 'Navigate up in list' },
        { keys: ['1'], description: 'Jump to first call' },
        { keys: ['2'], description: 'Jump to second call' },
        { keys: ['3'], description: 'Jump to third call' },
        { keys: ['/'], description: 'Focus search bar' },
      ],
    },
    {
      category: 'General',
      items: [
        { keys: ['?'], description: 'Show this help' },
        { keys: ['Ctrl', 'R'], description: 'Refresh data' },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Use these shortcuts to navigate and control calls faster
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold mb-3 text-foreground">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded">
                            {key}
                          </kbd>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Most shortcuts work globally when you're on the Voice page.
            Some shortcuts only work when a call is active.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
