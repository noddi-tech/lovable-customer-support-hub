import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConversationCounts } from './useConversationCounts';
import { useChannelCounts } from './useChannelCounts';
import { useInboxCounts } from './useInboxCounts';
import { useNotificationCounts } from './useNotificationCounts';

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

  // Use existing hooks but with shared cache
  const conversationCounts = useConversationCounts();
  const channelCounts = useChannelCounts();
  const inboxData = useInboxCounts();
  const notificationCount = useNotificationCounts();

  // Set up real-time subscriptions for count updates
  useEffect(() => {
    console.log('Setting up real-time subscriptions for optimized counts');

    // Subscribe to conversation changes
    const conversationChannel = supabase
      .channel('conversations-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('Conversation change detected:', payload);
          // Invalidate and refetch conversation-related counts
          queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
          queryClient.invalidateQueries({ queryKey: ['channel-counts'] });
        }
      )
      .subscribe();

    // Subscribe to notification changes
    const notificationChannel = supabase
      .channel('notifications-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('Notification change detected:', payload);
          // Invalidate and refetch notification counts
          queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
        }
      )
      .subscribe();

    // Subscribe to inbox changes
    const inboxChannel = supabase
      .channel('inboxes-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inboxes'
        },
        (payload) => {
          console.log('Inbox change detected:', payload);
          // Invalidate and refetch inbox counts
          queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(conversationChannel);
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(inboxChannel);
    };
  }, [queryClient]);

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

  // Combine loading states
  const loading = conversationCounts.isLoading || 
                  channelCounts.isLoading || 
                  inboxData.isLoading || 
                  notificationCount.isLoading;

  // Combine error states
  const error = conversationCounts.error?.message || 
                channelCounts.error?.message || 
                inboxData.error?.message || 
                notificationCount.error?.message || 
                null;

  return {
    conversations: conversationCounts.data || {
      all: 0,
      unread: 0,
      assigned: 0,
      pending: 0,
      closed: 0,
      archived: 0
    },
    channels: channelCounts.data || {
      email: 0,
      facebook: 0,
      instagram: 0,
      whatsapp: 0
    },
    notifications: notificationCount.data || 0,
    inboxes: inboxData.data || [],
    loading,
    error,
    prefetchData
  };
};