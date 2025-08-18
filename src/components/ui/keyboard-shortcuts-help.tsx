import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Keyboard, Mouse, ArrowUp, ArrowDown, CornerDownLeft, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const KeyboardShortcutsHelp = () => {
  const { t } = useTranslation();

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['↑', 'K'], description: 'Move up in lists' },
        { keys: ['↓', 'J'], description: 'Move down in lists' },
        { keys: ['Enter'], description: 'Select/Open item' },
        { keys: ['Esc'], description: 'Close panels/Exit navigation' },
      ]
    },
    {
      category: 'Tables',
      items: [
        { keys: ['Tab'], description: 'Navigate between columns' },
        { keys: ['Shift', 'Tab'], description: 'Navigate backwards' },
        { keys: ['Space'], description: 'Toggle selection' },
        { keys: ['Ctrl', 'A'], description: 'Select all' },
      ]
    },
    {
      category: 'Global',
      items: [
        { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts' },
        { keys: ['Ctrl', 'K'], description: 'Open command palette' },
        { keys: ['Alt', '1'], description: 'Go to Interactions' },
        { keys: ['Alt', '2'], description: 'Go to Marketing' },
        { keys: ['Alt', '3'], description: 'Go to Operations' },
      ]
    }
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Keyboard Shortcuts
        </CardTitle>
        <CardDescription>
          Navigate efficiently using these keyboard shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {shortcuts.map((category) => (
          <div key={category.category}>
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              {category.category}
            </h3>
            <div className="space-y-2">
              {category.items.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <span className="text-sm">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <React.Fragment key={keyIndex}>
                        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                          {key}
                        </kbd>
                        {keyIndex < shortcut.keys.length - 1 && (
                          <span className="text-xs text-muted-foreground">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Tip: Most shortcuts work when not focused on input fields
          </p>
        </div>
      </CardContent>
    </Card>
  );
};