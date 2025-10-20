import { useEffect } from 'react';
import { useConversationView } from '@/contexts/ConversationViewContext';

export const useConversationShortcuts = () => {
  const { conversation, updateStatus, dispatch } = useConversationView();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if not typing in an input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Don't trigger if modifier keys are pressed (except shift for some shortcuts)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'c':
          if (!event.shiftKey && conversation?.status !== 'closed') {
            event.preventDefault();
            updateStatus({ status: 'closed' });
          }
          break;
        case 'o':
          if (!event.shiftKey && conversation?.status !== 'open') {
            event.preventDefault();
            updateStatus({ status: 'open' });
          }
          break;
        case 'p':
          if (!event.shiftKey && conversation?.status !== 'pending') {
            event.preventDefault();
            updateStatus({ status: 'pending' });
          }
          break;
        case 'a':
          if (!event.shiftKey && conversation && !conversation.is_archived) {
            event.preventDefault();
            updateStatus({ isArchived: true });
          }
          break;
        case 's':
          if (!event.shiftKey) {
            event.preventDefault();
            dispatch({ 
              type: 'SET_SNOOZE_DIALOG', 
              payload: { open: true, date: new Date(), time: '09:00' } 
            });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [conversation, updateStatus, dispatch]);
};
