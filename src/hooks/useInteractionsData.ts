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
import { useAuth } from './useAuth';

/**
 * Hook to get accessible inboxes
 */
export function useAccessibleInboxes() {
  const { user, loading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ['inboxes'],
    enabled: !!user && !authLoading, // Only fetch when authenticated
    queryFn: async () => {
      try {
        return await listAccessibleInboxes();
      } catch (error: any) {
        // Handle auth-related errors by returning empty array
        if (error?.message?.includes('JWT expired') || 
            error?.message?.includes('refresh_token_not_found') ||
            error?.code === 'PGRST301' ||
            error?.code === 'PGRST116') {
          console.warn('Authentication issue detected, returning empty inboxes');
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
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
  return useQuery({
    queryKey: ['conversations', inboxId, status, q],
    queryFn: async () => {
      try {
        return await listConversations({ inboxId, status, q });
      } catch (error: any) {
        // Handle auth-related errors by returning empty array
        if (error?.message?.includes('JWT expired') || 
            error?.message?.includes('refresh_token_not_found') ||
            error?.code === 'PGRST301' ||
            error?.code === 'PGRST116') {
          console.warn('Authentication issue detected, returning empty conversations');
          return [];
        }
        throw error;
      }
    },
    enabled: !!inboxId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
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