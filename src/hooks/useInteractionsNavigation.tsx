import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StatusFilter, InboxId, ConversationId } from '@/types/interactions';

export interface NavigationState {
  selectedTab: string;
  selectedInboxId?: string;
  conversationId?: string;
  inbox?: InboxId;
  status: StatusFilter;
  search?: string;
}

export const useInteractionsNavigation = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current state from URL
  const getCurrentState = useCallback((): NavigationState => {
    return {
      selectedTab: searchParams.get('tab') || 'all',
      selectedInboxId: searchParams.get('inbox') || undefined,
      conversationId: searchParams.get('c') || searchParams.get('conversation') || undefined,
      inbox: searchParams.get('inbox') || undefined,
      status: (searchParams.get('status') || 'all') as StatusFilter,
      search: searchParams.get('q') || undefined,
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
    
    if (newState.selectedInboxId || newState.inbox) {
      newParams.set('inbox', newState.selectedInboxId || newState.inbox || '');
    }
    
    if (newState.conversationId) {
      newParams.set('c', newState.conversationId);
    }
    
    if (newState.status && newState.status !== 'all') {
      newParams.set('status', newState.status);
    }
    
    if (newState.search) {
      newParams.set('q', newState.search);
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

  // Set inbox (clears conversation, preserves status)
  const setInbox = useCallback((inboxId: InboxId) => {
    updateNavigation({ 
      selectedInboxId: inboxId, 
      inbox: inboxId,
      conversationId: undefined 
    });
  }, [updateNavigation]);

  // Set status filter (clears conversation)
  const setStatus = useCallback((status: StatusFilter) => {
    updateNavigation({ 
      status,
      conversationId: undefined 
    });
  }, [updateNavigation]);

  // Set search query (debounced)
  const setSearch = useCallback((search: string) => {
    updateNavigation({ search });
  }, [updateNavigation]);

  // Open conversation
  const openConversation = useCallback((conversationId: ConversationId) => {
    updateNavigation({ conversationId });
  }, [updateNavigation]);

  // Back to list (clear only conversation)
  const backToList = useCallback(() => {
    updateNavigation({ conversationId: undefined });
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
    setInbox,
    setStatus,
    setSearch,
    openConversation,
    backToList,
  };
};