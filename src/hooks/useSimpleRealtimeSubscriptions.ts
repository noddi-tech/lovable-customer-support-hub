import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
          console.log(`Realtime update for ${table}, invalidating ${queryKey}`);
          queryClient.invalidateQueries({ 
            predicate: (query) => query.queryKey[0] === queryKey 
          });
        }
      );
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log(`Realtime status: ${status}`);
      if (status === 'CHANNEL_ERROR') {
        console.error('Realtime subscription failed - falling back to polling');
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