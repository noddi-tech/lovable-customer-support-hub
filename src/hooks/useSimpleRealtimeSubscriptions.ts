import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface SimpleRealtimeConfig {
  table: string;
  queryKey: string;
}

// Global registry to prevent duplicate subscriptions
const activeChannels = new Map<string, { channel: any; refCount: number }>();

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

    // Generate unique channel key based on tables
    const channelKey = configs.map(c => c.table).sort().join('-');
    const channelName = `app-changes-${channelKey}`;

    const setupSubscription = () => {
      // Check if this subscription already exists
      const existing = activeChannels.get(channelKey);
      if (existing) {
        logger.debug('Reusing existing realtime subscription', { 
          channelKey, 
          tables: configs.map(c => c.table),
          refCount: existing.refCount + 1 
        }, 'Realtime');
        
        channelRef.current = existing.channel;
        existing.refCount++;
        setIsConnected(true);
        return;
      }

      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      logger.debug('Creating new realtime subscription', { 
        channelName,
        channelKey, 
        tables: configs.map(c => c.table) 
      }, 'Realtime');

      // Create a unique channel for this set of tables
      const channel = supabase.channel(channelName);

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
        logger.debug(`Connection status changed`, { 
          channelName,
          channelKey,
          status, 
          tables: configs.map(c => c.table),
          activeSubscriptions: activeChannels.size
        }, 'Realtime');
        
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
          
          // Register this channel in the global registry
          activeChannels.set(channelKey, { channel, refCount: 1 });
          
          logger.debug('Successfully subscribed to realtime', { 
            channelName,
            channelKey,
            tables: configs.map(c => c.table),
            activeSubscriptions: activeChannels.size
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
        const existing = activeChannels.get(channelKey);
        if (existing) {
          existing.refCount--;
          
          logger.debug('Unsubscribing from realtime', { 
            channelKey,
            remainingRefs: existing.refCount,
            activeSubscriptions: activeChannels.size
          }, 'Realtime');
          
          // Only remove channel if no more references
          if (existing.refCount <= 0) {
            supabase.removeChannel(channelRef.current);
            activeChannels.delete(channelKey);
            logger.debug('Removed realtime channel', { 
              channelKey,
              activeSubscriptions: activeChannels.size
            }, 'Realtime');
          }
        } else {
          // Fallback: remove channel if not in registry
          supabase.removeChannel(channelRef.current);
        }
        
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