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

  // Use single efficient query for all counts
  const { data: allCounts, isLoading, error } = useQuery({
    queryKey: ['all-counts'],
    queryFn: async () => {
      // Using raw query since the function isn't in the types yet
      const { data, error } = await supabase.rpc('get_all_counts' as any);
      if (error) {
        console.error('Error fetching all counts:', error);
        throw error;
      }
      return data as {
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
      };
    },
    refetchInterval: 120000, // Reduce to every 2 minutes instead of 30 seconds
    staleTime: 60000, // Consider data stale after 1 minute
  });

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
    conversations: allCounts?.conversations || {
      all: 0,
      unread: 0,
      assigned: 0,
      pending: 0,
      closed: 0,
      archived: 0
    },
    channels: allCounts?.channels || {
      email: 0,
      facebook: 0,
      instagram: 0,
      whatsapp: 0
    },
    notifications: allCounts?.notifications || 0,
    inboxes: allCounts?.inboxes || [],
    loading: isLoading,
    error: error?.message || null,
    prefetchData
  };
};