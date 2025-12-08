import { useCallback, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { StatusFilter, InboxId, ConversationId } from '@/types/interactions';

export interface NavigationState {
  selectedTab: string;
  selectedInboxId?: string;
  conversationId?: string;
  inbox?: InboxId;
  status: StatusFilter;
  search?: string;
  hash?: string; // For hash-based tab state
}

export const useInteractionsNavigation = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Get current state from URL (query params + hash)
  const getCurrentState = useCallback((): NavigationState => {
    const hash = location.hash.replace('#', '');
    return {
      selectedTab: searchParams.get('tab') || 'all',
      selectedInboxId: searchParams.get('inbox') || undefined,
      conversationId: searchParams.get('c') || searchParams.get('conversation') || undefined,
      inbox: searchParams.get('inbox') || undefined,
      status: (searchParams.get('status') || hash || 'open') as StatusFilter,
      search: searchParams.get('q') || undefined,
      hash: hash || undefined,
    };
  }, [searchParams, location.hash]);

  // Update navigation state (preserves hash separately)
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
    
    // Only set status in query params if it's not the default and not using hash
    if (newState.status && newState.status !== 'open' && !updates.hash) {
      newParams.set('status', newState.status);
    }
    
    if (newState.search) {
      newParams.set('q', newState.search);
    }
    
    // Update URL with hash if provided
    if (updates.hash !== undefined) {
      const newUrl = `${location.pathname}?${newParams.toString()}${updates.hash ? '#' + updates.hash : ''}`;
      window.history.replaceState(null, '', newUrl);
    } else {
      setSearchParams(newParams, { replace: true });
    }
  }, [getCurrentState, setSearchParams, location.pathname]);

  // Set hash-based tab state (for filter tabs like open/closed/archived)
  const setHashTab = useCallback((tab: string) => {
    const newUrl = `${location.pathname}${location.search}#${tab}`;
    window.history.replaceState(null, '', newUrl);
  }, [location.pathname, location.search]);

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
  const openConversation = useCallback((conversationId: ConversationId, threadIds?: string | string[]) => {
    const updates: Partial<NavigationState> = { conversationId };
    
    // Store threadIds if provided (for thread viewing)
    if (threadIds && Array.isArray(threadIds) && threadIds.length > 1) {
      // Store as comma-separated string in URL
      const newParams = new URLSearchParams(searchParams);
      newParams.set('c', conversationId);
      newParams.set('thread', threadIds.join(','));
      setSearchParams(newParams, { replace: true });
      return;
    }
    
    updateNavigation(updates);
  }, [updateNavigation, searchParams, setSearchParams]);

  // Back to list (clear only conversation)
  const backToList = useCallback(() => {
    updateNavigation({ conversationId: undefined });
  }, [updateNavigation]);

  // Clear conversation (back to list)
  const clearConversation = useCallback(() => {
    updateNavigation({ conversationId: undefined });
  }, [updateNavigation]);

  // Memoize current state to prevent unnecessary re-renders
  const currentState = useMemo(() => getCurrentState(), [getCurrentState]);

  return useMemo(() => ({
    currentState,
    updateNavigation,
    navigateToTab,
    navigateToConversation,
    navigateToInbox,
    clearConversation,
    setInbox,
    setStatus,
    setSearch,
    setHashTab,
    openConversation,
    backToList,
  }), [
    currentState,
    updateNavigation,
    navigateToTab,
    navigateToConversation,
    navigateToInbox,
    clearConversation,
    setInbox,
    setStatus,
    setSearch,
    setHashTab,
    openConversation,
    backToList,
  ]);
};