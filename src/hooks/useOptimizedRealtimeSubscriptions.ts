import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import throttle from 'lodash.throttle';
import debounce from 'lodash.debounce';

interface RealtimeSubscriptionConfig {
  table: string;
  events?: ('INSERT' | 'UPDATE' | 'DELETE')[];
  filter?: string;
  throttleMs?: number;
  debounceMs?: number;
  batchUpdates?: boolean;
  // Additional query keys to invalidate alongside the table
  invalidateKeys?: string[];
}


export const useOptimizedRealtimeSubscriptions = (
  configs: RealtimeSubscriptionConfig[],
  enabled: boolean = true
) => {
  const queryClient = useQueryClient();
  const channelsRef = useRef<Map<string, any>>(new Map());
  const pendingUpdatesRef = useRef<Set<string>>(new Set());
  
  // Throttled invalidation to prevent excessive re-fetches
  const throttledInvalidate = useCallback(
    throttle((queryKeys: string[]) => {
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      logger.info('Throttled query invalidation executed', { queryKeys }, 'RealtimeSubscriptions');
    }, 1000), // Throttle to max 1 invalidation per second
    [queryClient]
  );

  // Debounced batch update handler
  const debouncedBatchUpdate = useCallback(
    debounce(() => {
      const updates = Array.from(pendingUpdatesRef.current);
      if (updates.length > 0) {
        throttledInvalidate(updates);
        pendingUpdatesRef.current.clear();
      }
    }, 500), // Batch updates for 500ms
    [throttledInvalidate]
  );

  // Handle realtime event with optimizations
  const handleRealtimeEvent = useCallback((
    event: any,
    config: RealtimeSubscriptionConfig
  ) => {
    const { table, batchUpdates = true, invalidateKeys } = config;
    
    logger.debug('Realtime event received', {
      table,
      event: event.eventType,
      recordId: event.new?.id || event.old?.id
    }, 'RealtimeSubscriptions');

    const defaultExtraKeys = table === 'messages' ? ['conversations'] : [];
    const extraKeys = invalidateKeys && invalidateKeys.length > 0 ? invalidateKeys : defaultExtraKeys;
    const keysToInvalidate = [table, ...extraKeys];

    if (batchUpdates) {
      keysToInvalidate.forEach((k) => pendingUpdatesRef.current.add(k));
      debouncedBatchUpdate();
    } else {
      throttledInvalidate(keysToInvalidate);
    }

    // Handle specific optimizations based on event type
    switch (event.eventType) {
      case 'INSERT':
        if (table === 'conversations' || table === 'messages') {
          queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
        }
        break;
      case 'UPDATE':
        if (table === 'conversations' && event.new?.status !== event.old?.status) {
          queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
        }
        break;
      case 'DELETE':
        queryClient.removeQueries({ queryKey: [table, event.old?.id] });
        if (table === 'conversations' || table === 'messages') {
          queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
        }
        break;
    }

  }, [queryClient, debouncedBatchUpdate, throttledInvalidate]);

  // Set up subscriptions
  useEffect(() => {
    if (!enabled || configs.length === 0) return;

    logger.info('Setting up optimized realtime subscriptions', { 
      tables: configs.map(c => c.table) 
    }, 'RealtimeSubscriptions');

    // Clean up existing channels
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channelsRef.current.clear();

    // Create new channels for each config
    configs.forEach((config) => {
      const { table, events = ['INSERT', 'UPDATE', 'DELETE'], filter } = config;
      const channelName = `optimized-${table}-${Date.now()}`;

      let channel = supabase.channel(channelName);

      events.forEach((event) => {
        const subscriptionConfig: any = {
          event,
          schema: 'public',
          table,
        };

        if (filter) {
          subscriptionConfig.filter = filter;
        }

        channel = channel.on(
          'postgres_changes',
          subscriptionConfig,
          (payload) => handleRealtimeEvent(payload, config)
        );
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Realtime subscription active', { table, channelName }, 'RealtimeSubscriptions');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Realtime subscription error', { table, channelName, status }, 'RealtimeSubscriptions');
        }
      });

      channelsRef.current.set(channelName, channel);
    });

    // Cleanup function
    return () => {
      logger.info('Cleaning up realtime subscriptions', { 
        channelCount: channelsRef.current.size 
      }, 'RealtimeSubscriptions');

      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
      pendingUpdatesRef.current.clear();

      // Cancel any pending throttled/debounced calls
      throttledInvalidate.cancel();
      debouncedBatchUpdate.cancel();
    };
  }, [enabled, configs, handleRealtimeEvent, throttledInvalidate, debouncedBatchUpdate]);

  // Force cleanup on unmount
  useEffect(() => {
    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      throttledInvalidate.cancel();
      debouncedBatchUpdate.cancel();
    };
  }, [throttledInvalidate, debouncedBatchUpdate]);

  return {
    activeChannels: channelsRef.current.size,
    forceCleanup: () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
      pendingUpdatesRef.current.clear();
    }
  };
};