import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface SimpleRealtimeConfig {
  table: string;
  queryKey: string;
}

export const useSimpleRealtimeSubscriptions = (
  configs: SimpleRealtimeConfig[],
  enabled: boolean = true
) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);
  
  useEffect(() => {
    if (!enabled || configs.length === 0) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create a single channel for all subscriptions
    const channel = supabase.channel('app-changes');

    // Add listeners for each table
    configs.forEach(({ table, queryKey }) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        () => {
          logger.debug(`Realtime update received`, { table, queryKey }, 'Realtime');
          queryClient.invalidateQueries({ 
            predicate: (query) => query.queryKey[0] === queryKey 
          });
        }
      );
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      logger.debug(`Connection status changed`, { status, tables: configs.map(c => c.table) }, 'Realtime');
      if (status === 'CHANNEL_ERROR') {
        logger.error('Subscription failed - falling back to polling', { 
          tables: configs.map(c => c.table),
          status 
        }, 'Realtime');
      } else if (status === 'SUBSCRIBED') {
        logger.debug('Successfully subscribed to realtime', { 
          tables: configs.map(c => c.table) 
        }, 'Realtime');
      }
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, configs, queryClient]);

  return {
    isConnected: channelRef.current?.state === 'joined'
  };
};