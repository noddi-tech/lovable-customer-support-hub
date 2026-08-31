import React from 'react';
import { useCompose } from '@/contexts/ComposeContext';

interface NewConversationDialogProps {
  children: React.ReactNode;
}

/**
 * Trigger for composing a new email. Instead of a modal dialog, this now opens
 * a Gmail-style compose window docked at the bottom of the screen, so agents
 * can keep browsing the inbox and compose several emails at once.
 */
export const NewConversationDialog: React.FC<NewConversationDialogProps> = ({ children }) => {
  const { openCompose } = useCompose();

  return (
    <span
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openCompose();
      }}
      className="contents"
    >
      {children}
    </span>
  );
};
