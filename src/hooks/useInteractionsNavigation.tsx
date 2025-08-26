import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface NavigationState {
  selectedTab: string;
  selectedInboxId?: string;
  conversationId?: string;
  inbox?: string; // Add inbox parameter for master-list-detail
}

export const useInteractionsNavigation = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current state from URL
  const getCurrentState = useCallback((): NavigationState => {
    return {
      selectedTab: searchParams.get('tab') || 'all',
      selectedInboxId: searchParams.get('inbox') || undefined,
      conversationId: searchParams.get('c') || searchParams.get('conversation') || undefined,
      inbox: searchParams.get('inbox') || undefined, // Support both inbox params
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
      newParams.set('c', newState.conversationId);
    }
    
    if (newState.inbox) {
      newParams.set('inbox', newState.inbox);
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
    updateNavigation({ selectedInboxId: inboxId, inbox: inboxId });
  }, [updateNavigation]);

  // Clear conversation (back to list)
  const clearConversation = useCallback(() => {
    updateNavigation({ conversationId: undefined });
  }, [updateNavigation]);

  return {
    currentState: getCurrentState(),
    updateNavigation,
    navigateToTab,
    navigateToConversation,
    navigateToInbox,
    clearConversation,
  };
};