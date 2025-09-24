import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listAccessibleInboxes,
  getInboxCounts,
  listConversations,
  getThread,
  postReply
} from '@/data/interactions';
import type { 
  Inbox, 
  InboxCounts, 
  ConversationRow, 
  ConversationThread,
  StatusFilter,
  InboxId,
  ConversationId 
} from '@/types/interactions';
import { useAuth } from '@/components/auth/AuthContext';

/**
 * Hook to get accessible inboxes
 */
export function useAccessibleInboxes() {
  const { user, loading: authLoading, refreshSession } = useAuth();
  
  return useQuery({
    queryKey: ['inboxes'],
    enabled: !!user && !authLoading, // Only fetch when authenticated
    queryFn: async () => {
      try {
        return await listAccessibleInboxes();
      } catch (error: any) {
        // Handle auth-related errors by attempting session refresh
        if (error?.message?.includes('JWT expired') || 
            error?.message?.includes('refresh_token_not_found') ||
            error?.code === 'PGRST301' ||
            error?.code === 'PGRST116') {
          console.warn('Authentication issue detected, attempting session refresh...');
          
          const newSession = await refreshSession();
          if (newSession) {
            // Retry with refreshed session
            return await listAccessibleInboxes();
          }
          
          // If refresh fails, redirect to auth
          window.location.href = '/auth';
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors after refresh attempt
      if (error?.message?.includes('JWT expired') || 
          error?.message?.includes('refresh_token_not_found') ||
          error?.code === 'PGRST301' ||
          error?.code === 'PGRST116') {
        return false;
      }
      return failureCount < 2;
    }
  });
}

/**
 * Hook to get inbox counts
 */
export function useInboxCounts(inboxId: InboxId) {
  return useQuery({
    queryKey: ['inboxCounts', inboxId],
    queryFn: () => getInboxCounts(inboxId),
    enabled: !!inboxId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get conversations with filtering
 */
export function useConversations({ 
  inboxId, 
  status, 
  q 
}: { 
  inboxId: InboxId; 
  status: StatusFilter; 
  q?: string; 
}) {
  const { user, refreshSession, validateSession } = useAuth();
  
  return useQuery({
    queryKey: ['conversations', inboxId, status, q],
    queryFn: async () => {
      // Pre-validate session before making the request
      if (user) {
        const isValid = await validateSession();
        if (!isValid) {
          console.warn('Session invalid before conversations query, refreshing...');
          const newSession = await refreshSession();
          if (!newSession) {
            throw new Error('Session refresh failed');
          }
          // Brief delay to ensure session propagation
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      try {
        const conversations = await listConversations({ inboxId, status, q });
        console.log(`Loaded ${conversations.length} conversations for inbox ${inboxId}`);
        return conversations;
      } catch (error: any) {
        console.error('Conversations query failed:', error);
        
        // Handle auth-related errors with enhanced recovery
        if (error?.message?.includes('JWT expired') || 
            error?.message?.includes('refresh_token_not_found') ||
            error?.code === 'PGRST301' ||
            error?.code === 'PGRST116' ||
            error?.message?.includes('auth.uid() is null')) {
          
          console.warn('Authentication issue detected in conversations, attempting session recovery...');
          
          const newSession = await refreshSession();
          if (newSession) {
            // Wait for session to propagate and retry
            await new Promise(resolve => setTimeout(resolve, 500));
            
            try {
              const retryConversations = await listConversations({ inboxId, status, q });
              console.log(`Retry successful: loaded ${retryConversations.length} conversations`);
              return retryConversations;
            } catch (retryError) {
              console.error('Retry after session refresh also failed:', retryError);
              throw retryError;
            }
          }
          
          // If refresh fails, return empty array and let user know
          console.error('Session refresh failed, returning empty conversations');
          return [];
        }
        throw error;
      }
    },
    enabled: !!inboxId && !!user,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors after refresh attempt
      if (error?.message?.includes('JWT expired') || 
          error?.message?.includes('refresh_token_not_found') ||
          error?.code === 'PGRST301' ||
          error?.code === 'PGRST116' ||
          error?.message?.includes('auth.uid() is null')) {
        return false;
      }
      return failureCount < 2;
    }
  });
}

/**
 * Hook to get conversation thread
 */
export function useThread(conversationId?: ConversationId) {
  return useQuery({
    queryKey: ['thread', conversationId],
    queryFn: () => conversationId ? getThread(conversationId) : null,
    enabled: !!conversationId,
    staleTime: 10 * 1000, // 10 seconds - fresh for active conversations
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to post replies with optimistic updates
 */
export function useReply(conversationId: ConversationId, inboxId: InboxId, status: StatusFilter, q?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (body: string) => postReply(conversationId, { body }),
    onMutate: async (body: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['thread', conversationId] });
      
      // Snapshot previous value
      const previousThread = queryClient.getQueryData<ConversationThread>(['thread', conversationId]);
      
      // Optimistically update thread
      if (previousThread) {
        const optimisticMessage = {
          id: 'optimistic-' + Date.now(),
          author: 'Agent',
          content: body,
          bodyText: body,
          createdAt: new Date().toISOString(),
          inbound: false,
          senderType: 'agent' as const,
          isInternal: false
        };
        
        queryClient.setQueryData(['thread', conversationId], {
          ...previousThread,
          messages: [...previousThread.messages, optimisticMessage]
        });
      }
      
      return { previousThread };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousThread) {
        queryClient.setQueryData(['thread', conversationId], context.previousThread);
      }
      toast.error('Failed to send reply');
    },
    onSettled: () => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: ['thread', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', inboxId, status, q] });
      queryClient.invalidateQueries({ queryKey: ['inboxCounts', inboxId] });
      queryClient.invalidateQueries({ queryKey: ['all-counts'] }); // For global counts
    },
    onSuccess: () => {
      toast.success('Reply sent successfully');
    }
  });
}

/**
 * Hook for infinite conversations (for large datasets)
 */
export function useInfiniteConversations({ 
  inboxId, 
  status, 
  q 
}: { 
  inboxId: InboxId; 
  status: StatusFilter; 
  q?: string; 
}) {
  return useInfiniteQuery({
    queryKey: ['conversations-infinite', inboxId, status, q],
    queryFn: ({ pageParam = 0 }) => 
      listConversations({ inboxId, status, q, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      // Simple pagination - return next page if we have a full page
      return lastPage.length === 50 ? pages.length : undefined;
    },
    enabled: !!inboxId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}