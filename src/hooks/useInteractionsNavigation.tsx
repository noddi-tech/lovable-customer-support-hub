import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface NavigationState {
  selectedTab: string;
  selectedInboxId?: string;
  conversationId?: string;
}

export const useInteractionsNavigation = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current state from URL
  const getCurrentState = useCallback((): NavigationState => {
    return {
      selectedTab: searchParams.get('tab') || 'all',
      selectedInboxId: searchParams.get('inbox') || undefined,
      conversationId: searchParams.get('conversation') || undefined,
    };
  }, [searchParams]);

  // Update navigation state
  const updateNavigation = useCallback((updates: Partial<NavigationState>) => {
    const current = getCurrentState();
    const newState = { ...current, ...updates };
    
    const newParams = new URLSearchParams();
    
    if (newState.selectedTab && newState.selectedTab !== 'all') {
      newParams.set('tab', newState.selectedTab);
    }
    
    if (newState.selectedInboxId) {
      newParams.set('inbox', newState.selectedInboxId);
    }
    
    if (newState.conversationId) {
      newParams.set('conversation', newState.conversationId);
    }
    
    setSearchParams(newParams, { replace: true });
  }, [getCurrentState, setSearchParams]);

  // Navigate to tab
  const navigateToTab = useCallback((tab: string) => {
    updateNavigation({ selectedTab: tab });
  }, [updateNavigation]);

  // Navigate to conversation
  const navigateToConversation = useCallback((conversationId: string) => {
    updateNavigation({ conversationId });
  }, [updateNavigation]);

  // Navigate to inbox
  const navigateToInbox = useCallback((inboxId: string) => {
    updateNavigation({ selectedInboxId: inboxId });
  }, [updateNavigation]);

  return {
    currentState: getCurrentState(),
    updateNavigation,
    navigateToTab,
    navigateToConversation,
    navigateToInbox,
  };
};