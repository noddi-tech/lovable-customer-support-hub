import { useEffect, useRef, useState } from 'react';
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
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const hasLoggedErrorRef = useRef(false);
  
  useEffect(() => {
    if (!enabled || configs.length === 0) return;

    const setupSubscription = () => {
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
          setIsConnected(false);
          
          // Only log error once to avoid spam
          if (!hasLoggedErrorRef.current) {
            logger.error('Subscription failed - falling back to polling', { 
              tables: configs.map(c => c.table),
              status 
            }, 'Realtime');
            hasLoggedErrorRef.current = true;
          }

          // Retry with exponential backoff (max 3 retries)
          if (retryCountRef.current < 3) {
            const delay = Math.pow(2, retryCountRef.current) * 1000; // 1s, 2s, 4s
            logger.debug(`Retrying subscription in ${delay}ms`, { 
              attempt: retryCountRef.current + 1,
              tables: configs.map(c => c.table) 
            }, 'Realtime');
            
            retryTimeoutRef.current = setTimeout(() => {
              retryCountRef.current++;
              setupSubscription();
            }, delay);
          }
        } else if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          retryCountRef.current = 0; // Reset retry count on success
          hasLoggedErrorRef.current = false; // Reset error log flag
          logger.debug('Successfully subscribed to realtime', { 
            tables: configs.map(c => c.table) 
          }, 'Realtime');
        }
      });

      channelRef.current = channel;
    };

    setupSubscription();

    // Cleanup
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      retryCountRef.current = 0;
      hasLoggedErrorRef.current = false;
    };
  }, [enabled, configs, queryClient]);

  return {
    isConnected
  };
};