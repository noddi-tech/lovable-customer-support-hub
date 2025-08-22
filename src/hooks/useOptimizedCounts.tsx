import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedRealtimeSubscriptions } from './useOptimizedRealtimeSubscriptions';

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
      const { data, error } = await supabase.rpc('get_all_counts');
      if (error) {
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
    },
    refetchInterval: 120000, // Refetch every 2 minutes
    staleTime: 60000, // Consider data stale after 1 minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Add final step: set up variables properly
  const { data: allCounts, isLoading, error } = countsQuery;
  // Set up optimized real-time subscriptions
  useOptimizedRealtimeSubscriptions([
    {
      table: 'conversations',
      events: ['INSERT', 'UPDATE', 'DELETE'],
      invalidateKeys: ['all-counts'],
      throttleMs: 2000,
      batchUpdates: true,
    },
    {
      table: 'notifications',
      events: ['INSERT', 'UPDATE', 'DELETE'],
      filter: 'user_id=eq.auth.user_id',
      invalidateKeys: ['all-counts'],
      throttleMs: 1000,
    },
    {
      table: 'inboxes',
      events: ['INSERT', 'UPDATE', 'DELETE'],
      invalidateKeys: ['all-counts'],
      throttleMs: 3000,
      batchUpdates: true,
    },
  ]);

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