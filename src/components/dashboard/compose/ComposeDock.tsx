import React from 'react';
import { useCompose } from '@/contexts/ComposeContext';
import { ComposeWindow } from './ComposeWindow';

/**
 * Renders all open compose windows docked to the bottom-right of the screen,
 * Gmail style. Multiple windows can be open at once; minimized ones collapse
 * into title bars.
 */
export const ComposeDock: React.FC = () => {
  const { openWindows } = useCompose();

  if (openWindows.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 z-[60] flex items-end gap-3 p-0 pr-4 pointer-events-none">
      {openWindows.map((draft) => (
        <div key={draft.id} className="pointer-events-auto">
          <ComposeWindow draft={draft} />
        </div>
      ))}
    </div>
  );
};
