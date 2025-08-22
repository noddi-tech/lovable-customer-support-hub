import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleRealtimeSubscriptions } from './useSimpleRealtimeSubscriptions';

export interface OptimizedCounts {
  conversations: {
    all: number;
    unread: number;
    assigned: number;
    pending: number;
    closed: number;
    archived: number;
  };
  channels: {
    email: number;
    facebook: number;
    instagram: number;
    whatsapp: number;
  };
  notifications: number;
  inboxes: Array<{
    id: string;
    name: string;
    color: string;
    conversation_count: number;
    is_active: boolean;
  }>;
  loading: boolean;
  error: string | null;
  prefetchData: (dataType: string) => void;
}

export const useOptimizedCounts = (): OptimizedCounts => {
  const queryClient = useQueryClient();

  // Get all counts efficiently with single RPC call
  const countsQuery = useQuery({
    queryKey: ['all-counts'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_all_counts');
        if (error) {
          // Handle different error types gracefully
          if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
              error.message?.includes('NetworkError') ||
              error.message?.includes('blocked')) {
            console.warn('Network request blocked, using cached data if available');
            // Return minimal valid data structure instead of throwing
            return {
              conversations: { all: 0, unread: 0, assigned: 0, pending: 0, closed: 0, archived: 0 },
              channels: { email: 0, facebook: 0, instagram: 0, whatsapp: 0 },
              notifications: 0,
              inboxes: []
            };
          }
          console.error('Error fetching all counts:', error);
          throw error;
        }
        
        // Transform the single-row result to our interface format
        const result = data?.[0];
        if (!result) {
          throw new Error('No data returned from get_all_counts');
        }
        
        return {
          conversations: {
            all: Number(result.conversations_all) || 0,
            unread: Number(result.conversations_unread) || 0,
            assigned: Number(result.conversations_assigned) || 0,
            pending: Number(result.conversations_pending) || 0,
            closed: Number(result.conversations_closed) || 0,
            archived: Number(result.conversations_archived) || 0,
          },
          channels: {
            email: Number(result.channels_email) || 0,
            facebook: Number(result.channels_facebook) || 0,
            instagram: Number(result.channels_instagram) || 0,
            whatsapp: Number(result.channels_whatsapp) || 0,
          },
          notifications: Number(result.notifications_unread) || 0,
          inboxes: Array.isArray(result.inboxes_data) ? result.inboxes_data as Array<{
            id: string;
            name: string;
            color: string;
            conversation_count: number;
            is_active: boolean;
          }> : []
        };
      } catch (networkError: any) {
        // Graceful degradation for network errors
        if (networkError.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
            networkError.message?.includes('NetworkError') ||
            networkError.name === 'NetworkError') {
          console.warn('Network blocked, falling back to empty state');
          return {
            conversations: { all: 0, unread: 0, assigned: 0, pending: 0, closed: 0, archived: 0 },
            channels: { email: 0, facebook: 0, instagram: 0, whatsapp: 0 },
            notifications: 0,
            inboxes: []
          };
        }
        throw networkError;
      }
    },
    refetchInterval: 300000, // 5 minutes - less frequent polling for better performance
    staleTime: 240000, // 4 minutes stale time - use cached data longer
    retry: (failureCount, error: any) => {
      // Don't retry blocked requests
      if (error?.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
          error?.message?.includes('blocked')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Set up variables properly  
  const { data: allCounts, isLoading, error } = countsQuery;
  
  // Simple realtime subscriptions for essential updates only
  useSimpleRealtimeSubscriptions([
    { table: 'conversations', queryKey: 'all-counts' },
    { table: 'notifications', queryKey: 'all-counts' },
  ], !isLoading && !error);

  // Prefetch related data when user hovers over navigation items
  const prefetchData = useCallback((dataType: string) => {
    switch (dataType) {
      case 'conversations':
        queryClient.prefetchQuery({
          queryKey: ['conversations'],
          queryFn: async () => {
            const { data } = await supabase.rpc('get_conversations');
            return data;
          },
          staleTime: 30000
        });
        break;
      case 'notifications':
        queryClient.prefetchQuery({
          queryKey: ['notifications'],
          queryFn: async () => {
            const { data } = await supabase
              .from('notifications')
              .select('*')
              .eq('is_read', false)
              .order('created_at', { ascending: false });
            return data;
          },
          staleTime: 30000
        });
        break;
    }
  }, [queryClient]);

  return {
    conversations: countsQuery.data?.conversations || {
      all: 0,
      unread: 0,
      assigned: 0,
      pending: 0,
      closed: 0,
      archived: 0
    },
    channels: countsQuery.data?.channels || {
      email: 0,
      facebook: 0,
      instagram: 0,
      whatsapp: 0
    },
    notifications: countsQuery.data?.notifications || 0,
    inboxes: countsQuery.data?.inboxes || [],
    loading: countsQuery.isLoading,
    error: countsQuery.error?.message || null,
    prefetchData
  };
};