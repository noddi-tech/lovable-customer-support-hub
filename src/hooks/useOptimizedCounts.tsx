import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleRealtimeSubscriptions } from './useSimpleRealtimeSubscriptions';
import { useNetworkErrorHandler } from './useNetworkErrorHandler';
import { useAuth } from './useAuth';

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
  isInboxSpecific: boolean;
}

export const useOptimizedCounts = (selectedInboxId?: string): OptimizedCounts => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { createResilientQuery } = useNetworkErrorHandler({
    suppressAnalyticsErrors: true,
    retryAttempts: 2,
    retryDelay: 2000
  });

  // Default fallback data structure
  const defaultCounts = {
    conversations: { all: 0, unread: 0, assigned: 0, pending: 0, closed: 0, archived: 0 },
    channels: { email: 0, facebook: 0, instagram: 0, whatsapp: 0 },
    notifications: 0,
    inboxes: []
  };

  // Get counts efficiently - either global or inbox-specific
  const countsQuery = useQuery({
    queryKey: selectedInboxId ? ['inbox-counts', selectedInboxId] : ['all-counts'],
    enabled: !!user && !authLoading, // Only fetch when authenticated
    queryFn: createResilientQuery(
      async () => {
        try {
          if (selectedInboxId) {
            // Fetch inbox-specific counts
            const { data, error } = await supabase.rpc('get_inbox_counts', { inbox_uuid: selectedInboxId });
            if (error) {
              if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
                  error.message?.includes('NetworkError') ||
                  error.message?.includes('blocked')) {
                console.warn('Network request blocked, using cached data if available');
                return { ...defaultCounts, inboxes: [] };
              }
              console.error('Error fetching inbox counts:', error);
              throw error;
            }
            
            const result = data?.[0];
            if (!result) {
              throw new Error('No data returned from get_inbox_counts');
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
              notifications: 0, // Notifications are global, not inbox-specific
              inboxes: [] // Don't show inbox breakdown when viewing specific inbox
            };
          } else {
            // Fetch global counts
            const { data, error } = await supabase.rpc('get_all_counts');
            if (error) {
              if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
                  error.message?.includes('NetworkError') ||
                  error.message?.includes('blocked')) {
                console.warn('Network request blocked, using cached data if available');
                return defaultCounts;
              }
              console.error('Error fetching all counts:', error);
              throw error;
            }
            
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
          }
        } catch (networkError: any) {
          // Graceful degradation for network and auth errors
          if (networkError.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
              networkError.message?.includes('NetworkError') ||
              networkError.name === 'NetworkError' ||
              networkError.message?.includes('JWT expired') ||
              networkError.message?.includes('refresh_token_not_found') ||
              networkError.code === 'PGRST301' ||
              networkError.code === 'PGRST116') {
            console.warn('Network/Auth error, falling back to empty state:', networkError.message);
            return selectedInboxId ? { ...defaultCounts, inboxes: [] } : defaultCounts;
          }
          throw networkError;
        }
      },
      selectedInboxId ? `inbox-counts-${selectedInboxId}` : 'all-counts',
      selectedInboxId ? { ...defaultCounts, inboxes: [] } : defaultCounts
    ),
    refetchInterval: 300000, // 5 minutes - less frequent polling for better performance
    staleTime: 240000, // 4 minutes stale time - use cached data longer
    gcTime: 10 * 60 * 1000, // 10 minute garbage collection
    retry: false, // Let the network handler manage retries
  });

  // Set up variables properly  
  const { data: allCounts, isLoading, error } = countsQuery;
  
  // Simple realtime subscriptions for essential updates only
  useSimpleRealtimeSubscriptions([
    { table: 'conversations', queryKey: selectedInboxId ? `inbox-counts-${selectedInboxId}` : 'all-counts' },
    { table: 'notifications', queryKey: selectedInboxId ? '' : 'all-counts' }, // Only global notifications
  ].filter(sub => sub.queryKey), !isLoading && !error);

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
    conversations: user ? (countsQuery.data?.conversations || defaultCounts.conversations) : defaultCounts.conversations,
    channels: user ? (countsQuery.data?.channels || defaultCounts.channels) : defaultCounts.channels,
    notifications: user ? (countsQuery.data?.notifications || defaultCounts.notifications) : defaultCounts.notifications,
    inboxes: user ? (countsQuery.data?.inboxes || defaultCounts.inboxes) : defaultCounts.inboxes,
    loading: authLoading || countsQuery.isLoading,
    error: !user && !authLoading ? 'Please log in to view data' : (countsQuery.error?.message || null),
    prefetchData,
    isInboxSpecific: !!selectedInboxId
  };
};