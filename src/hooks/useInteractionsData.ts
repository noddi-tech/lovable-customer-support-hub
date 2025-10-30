import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger';
import {
  listAccessibleInboxes,
  getInboxCounts,
  listConversations,
  getThread,
  postReply,
  isAuthError
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
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get accessible inboxes
 */
export function useAccessibleInboxes() {
  const { user, loading: authLoading, refreshSession } = useAuth();
  const navigate = useNavigate();
  
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
          
          // If refresh fails, navigate to auth
          navigate('/auth', { replace: true });
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
      // Step 1: Validate database session context first
      try {
        const { data: sessionCheck } = await supabase.rpc('validate_session_context');
        
        if (!sessionCheck || !Array.isArray(sessionCheck) || sessionCheck.length === 0) {
          throw new Error('Session context validation RPC failed');
        }
        
        const sessionInfo = sessionCheck[0];
        
        logger.debug('Session validation result', {
          auth_uid: sessionInfo?.auth_uid,
          session_valid: sessionInfo?.session_valid,
          profile_exists: sessionInfo?.profile_exists,
          organization_id: sessionInfo?.organization_id
        }, 'Auth');

        // If auth.uid() is null in database context, force session sync
        if (!sessionInfo?.session_valid || !sessionInfo?.auth_uid) {
          logger.warn('Database session invalid, attempting recovery', undefined, 'Auth');
          
          const newSession = await refreshSession();
          if (!newSession) {
            throw new Error('Session refresh failed - auth.uid() is null');
          }
          
          // Wait for session propagation
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Re-validate
          const { data: recheckSession } = await supabase.rpc('validate_session_context');
          
          if (!recheckSession || !Array.isArray(recheckSession) || recheckSession.length === 0) {
            throw new Error('Session recheck RPC failed');
          }
          
          const recheckInfo = recheckSession[0];
          
          if (!recheckInfo?.session_valid) {
            throw new Error('Session sync failed - database context not restored');
          }
        }
      } catch (validationError) {
        console.error('Session validation failed:', validationError);
        throw validationError;
      }

      // Step 2: Now fetch conversations with validated session
      try {
        const conversations = await listConversations({ inboxId, status, q });
        logger.debug('Conversations loaded', { count: conversations.length, inboxId }, 'Interactions');
        return conversations;
      } catch (error: any) {
        logger.error('Conversations query failed', error, 'Interactions');
        
        // Handle auth-related errors with enhanced recovery
        if (error?.message?.includes('JWT expired') || 
            error?.message?.includes('refresh_token_not_found') ||
            error?.code === 'PGRST301' ||
            error?.code === 'PGRST116' ||
            error?.message?.includes('auth.uid()')) {
          
          logger.warn('Auth error detected, final recovery attempt', undefined, 'Auth');
          
          const newSession = await refreshSession();
          if (newSession) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            try {
              const retryConversations = await listConversations({ inboxId, status, q });
              logger.info('Retry successful', { count: retryConversations.length }, 'Interactions');
              return retryConversations;
            } catch (retryError) {
              logger.error('Final retry failed', retryError, 'Auth');
              throw new Error('Session sync failed - conversations still not accessible');
            }
          }
          
          throw new Error('Session expired - please refresh or log in again');
        }
        throw error;
      }
    },
    enabled: !!inboxId && !!user,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('Session') || error?.message?.includes('auth.uid()')) {
        return false; // Don't retry session errors
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