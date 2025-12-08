import { useCallback, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate, useParams } from 'react-router-dom';
import { StatusFilter, InboxId, ConversationId } from '@/types/interactions';

export interface NavigationState {
  selectedTab: string;
  selectedInboxId?: string;
  conversationId?: string;
  inbox?: InboxId;
  status: StatusFilter;
  search?: string;
  hash?: string;
}

export const useInteractionsNavigation = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ filter?: string }>();

  // Get current state from URL (path + query params)
  const getCurrentState = useCallback((): NavigationState => {
    const hash = location.hash.replace('#', '');
    
    // Get status from path segment (e.g., /interactions/text/open)
    const statusFromPath = params.filter || 'open';
    
    return {
      selectedTab: searchParams.get('tab') || 'all',
      selectedInboxId: searchParams.get('inbox') || undefined,
      conversationId: searchParams.get('c') || searchParams.get('conversation') || undefined,
      inbox: searchParams.get('inbox') || undefined,
      status: statusFromPath as StatusFilter,
      search: searchParams.get('q') || undefined,
      hash: hash || undefined,
    };
  }, [searchParams, location.hash, params.filter]);

  // Update navigation state via URL
  const updateNavigation = useCallback((updates: Partial<NavigationState>) => {
    const current = getCurrentState();
    const newState = { ...current, ...updates };
    
    // If status is being updated, navigate to new path
    if (updates.status !== undefined && updates.status !== current.status) {
      const pathParts = location.pathname.split('/');
      const basePath = pathParts.slice(0, 3).join('/');
      const newPath = `${basePath}/${updates.status}`;
      
      const newParams = new URLSearchParams();
      if (newState.selectedInboxId || newState.inbox) {
        newParams.set('inbox', newState.selectedInboxId || newState.inbox || '');
      }
      if (newState.conversationId && updates.conversationId !== undefined) {
        newParams.set('c', newState.conversationId);
      }
      if (newState.search) {
        newParams.set('q', newState.search);
      }
      
      const queryString = newParams.toString();
      const fullPath = queryString ? `${newPath}?${queryString}` : newPath;
      navigate(fullPath, { replace: true });
      return;
    }
    
    // Otherwise just update query params
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
  }, [getCurrentState, setSearchParams, location.pathname, navigate]);

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

  // Set status filter (navigates to new path)
  const setStatus = useCallback((status: StatusFilter) => {
    // Build new path: /interactions/text/[status]
    const pathParts = location.pathname.split('/');
    const basePath = pathParts.slice(0, 3).join('/');
    const newPath = `${basePath}/${status}`;
    
    // Preserve query params except conversation
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('c');
    
    const queryString = newParams.toString();
    const fullPath = queryString ? `${newPath}?${queryString}` : newPath;
    
    navigate(fullPath, { replace: false });
  }, [location.pathname, searchParams, navigate]);

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
