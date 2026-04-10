import { useCallback, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate, useParams } from 'react-router-dom';
import { StatusFilter, InboxId, ConversationId } from '@/types/interactions';

export interface NavigationState {
  selectedTab: string;
  selectedInboxId?: string;
  conversationId?: string;
  messageId?: string;
  inbox?: InboxId;
  status: StatusFilter;
  search?: string;
  hash?: string;
}

export const useInteractionsNavigation = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ filter?: string; conversationId?: string }>();

  // Determine the interaction type (text/chat) and whether we're on a conversation route
  const getInteractionType = useCallback((): 'text' | 'chat' | 'voice' => {
    if (location.pathname.includes('/interactions/chat')) return 'chat';
    if (location.pathname.includes('/interactions/voice')) return 'voice';
    return 'text';
  }, [location.pathname]);

  // Check if we're on a conversation resource route
  const isConversationRoute = location.pathname.includes('/conversations/');

  // Get current state from URL (path + query params)
  const getCurrentState = useCallback((): NavigationState => {
    const hash = location.hash.replace('#', '');
    
    // Get conversationId from path if on resource route
    const conversationId = params.conversationId || undefined;
    
    // Get status from path segment (e.g., /interactions/text/open)
    // When on a conversation route, status isn't in the URL
    const statusFromPath = isConversationRoute ? 'open' : (params.filter || 'open');
    
    return {
      selectedTab: searchParams.get('tab') || 'all',
      selectedInboxId: searchParams.get('inbox') || undefined,
      conversationId,
      messageId: searchParams.get('m') || undefined,
      inbox: searchParams.get('inbox') || undefined,
      status: statusFromPath as StatusFilter,
      search: searchParams.get('q') || undefined,
      hash: hash || undefined,
    };
  }, [searchParams, location.hash, params.filter, params.conversationId, isConversationRoute]);

  // Set hash-based tab state (for filter tabs like open/closed/archived)
  const setHashTab = useCallback((tab: string) => {
    const newUrl = `${location.pathname}${location.search}#${tab}`;
    window.history.replaceState(null, '', newUrl);
  }, [location.pathname, location.search]);

  // Navigate to tab
  const navigateToTab = useCallback((tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (tab && tab !== 'all') {
      newParams.set('tab', tab);
    } else {
      newParams.delete('tab');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Navigate to conversation (alias)
  const navigateToConversation = useCallback((conversationId: string) => {
    const type = getInteractionType();
    navigate(`/interactions/${type}/conversations/${conversationId}`);
  }, [navigate, getInteractionType]);

  // Navigate to inbox
  const navigateToInbox = useCallback((inboxId: string) => {
    const type = getInteractionType();
    const currentState = getCurrentState();
    const newParams = new URLSearchParams();
    if (inboxId) newParams.set('inbox', inboxId);
    const qs = newParams.toString();
    const status = currentState.status || 'open';
    navigate(`/interactions/${type}/${status}${qs ? `?${qs}` : ''}`, { replace: true });
  }, [navigate, getInteractionType, getCurrentState]);

  // Set inbox (clears conversation by navigating to list, preserves status)
  const setInbox = useCallback((inboxId: InboxId) => {
    const type = getInteractionType();
    const currentState = getCurrentState();
    const newParams = new URLSearchParams();
    if (inboxId) newParams.set('inbox', inboxId);
    if (currentState.search) newParams.set('q', currentState.search);
    const qs = newParams.toString();
    const status = currentState.status || 'open';
    navigate(`/interactions/${type}/${status}${qs ? `?${qs}` : ''}`, { replace: true });
  }, [navigate, getInteractionType, getCurrentState]);

  // Set status filter (navigates to new list path)
  const setStatus = useCallback((status: StatusFilter) => {
    const type = getInteractionType();
    
    // Preserve query params (inbox, search) but not conversation
    const newParams = new URLSearchParams();
    const inbox = searchParams.get('inbox');
    const q = searchParams.get('q');
    if (inbox) newParams.set('inbox', inbox);
    if (q) newParams.set('q', q);
    
    const qs = newParams.toString();
    navigate(`/interactions/${type}/${status}${qs ? `?${qs}` : ''}`, { replace: false });
  }, [getInteractionType, searchParams, navigate]);

  // Set search query
  const setSearch = useCallback((search: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (search) {
      newParams.set('q', search);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Open conversation — navigates to resource URL (pushes history)
  const openConversation = useCallback((conversationId: ConversationId, threadIds?: string | string[]) => {
    const type = getInteractionType();
    
    const newParams = new URLSearchParams();
    if (threadIds && Array.isArray(threadIds) && threadIds.length > 1) {
      newParams.set('thread', threadIds.join(','));
    }
    const qs = newParams.toString();
    
    navigate(`/interactions/${type}/conversations/${conversationId}${qs ? `?${qs}` : ''}`);
  }, [navigate, getInteractionType]);

  // Open specific message within conversation
  const openMessage = useCallback((conversationId: ConversationId, messageId: string) => {
    const type = getInteractionType();
    navigate(`/interactions/${type}/conversations/${conversationId}?m=${messageId}`);
  }, [navigate, getInteractionType]);

  // Set message ID (for scrolling to specific message)
  const setMessageId = useCallback((messageId: string | undefined) => {
    const newParams = new URLSearchParams(searchParams);
    if (messageId) {
      newParams.set('m', messageId);
    } else {
      newParams.delete('m');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Back to list — navigate back in history
  const backToList = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Clear conversation (back to list)
  const clearConversation = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Update navigation state via URL (legacy compat — used for non-conversation state)
  const updateNavigation = useCallback((updates: Partial<NavigationState>) => {
    // If opening a conversation, use openConversation
    if (updates.conversationId) {
      openConversation(updates.conversationId);
      return;
    }
    // If clearing conversation, use backToList
    if (updates.conversationId === undefined && isConversationRoute) {
      backToList();
      return;
    }
    // For status changes
    if (updates.status !== undefined) {
      setStatus(updates.status as StatusFilter);
      return;
    }
    // For other param updates
    const newParams = new URLSearchParams(searchParams);
    if (updates.selectedTab && updates.selectedTab !== 'all') {
      newParams.set('tab', updates.selectedTab);
    }
    if (updates.selectedInboxId || updates.inbox) {
      newParams.set('inbox', updates.selectedInboxId || updates.inbox || '');
    }
    if (updates.search) {
      newParams.set('q', updates.search);
    } else if (updates.search === '') {
      newParams.delete('q');
    }
    if (updates.hash !== undefined) {
      const newUrl = `${location.pathname}?${newParams.toString()}${updates.hash ? '#' + updates.hash : ''}`;
      window.history.replaceState(null, '', newUrl);
    } else {
      setSearchParams(newParams, { replace: true });
    }
  }, [openConversation, backToList, setStatus, isConversationRoute, searchParams, setSearchParams, location.pathname]);

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
    openMessage,
    setMessageId,
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
    openMessage,
    setMessageId,
    backToList,
  ]);
};
