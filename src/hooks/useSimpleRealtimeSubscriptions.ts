import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface SimpleRealtimeConfig {
  table: string;
  queryKey: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Global registry to prevent duplicate subscriptions
const activeChannels = new Map<string, { channel: any; refCount: number; status: ConnectionStatus }>();

export const useSimpleRealtimeSubscriptions = (
  configs: SimpleRealtimeConfig[],
  enabled: boolean = true
) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const autoRetryIntervalRef = useRef<NodeJS.Timeout>();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const hasLoggedErrorRef = useRef(false);
  const setupSubscriptionRef = useRef<() => void>();
  
  // Store configs in ref to prevent effect recreation on reference changes
  const configsRef = useRef(configs);
  configsRef.current = configs;
  
  // Generate unique channel key based on tables
  const channelKey = configs.map(c => c.table).sort().join('-');
  const channelName = `app-changes-${channelKey}`;
  
  // Store channelKey in ref to avoid dependency loops
  const channelKeyRef = useRef(channelKey);
  channelKeyRef.current = channelKey;

  // Force reconnect function - exposed to consumers (stable reference)
  const forceReconnect = useCallback(() => {
    if (!enabled || configs.length === 0) return;
    
    const currentChannelKey = channelKeyRef.current;
    logger.info('Force reconnect triggered', { channelKey: currentChannelKey }, 'Realtime');
    
    // Reset retry state
    retryCountRef.current = 0;
    hasLoggedErrorRef.current = false;
    
    // Clear any pending retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    // Remove existing channel from registry and Supabase
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      activeChannels.delete(currentChannelKey);
      channelRef.current = null;
    }
    
    // Set to connecting and re-run setup
    setConnectionStatus('connecting');
    
    // Re-run setup subscription
    if (setupSubscriptionRef.current) {
      setupSubscriptionRef.current();
    }
  }, [enabled, configs.length]); // Removed channelKey - use ref instead
  
  // Store forceReconnect in ref for auto-retry effect
  const forceReconnectRef = useRef(forceReconnect);
  forceReconnectRef.current = forceReconnect;

  useEffect(() => {
    if (!enabled || configs.length === 0) return;

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
        setConnectionStatus(existing.status);
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
          (payload) => {
            // PROMINENT LOG for debugging - confirm real-time events are firing
            console.log('🔔 [REALTIME EVENT]', {
              table,
              queryKey,
              event: payload.eventType,
              recordId: (payload.new as Record<string, unknown>)?.id || (payload.old as Record<string, unknown>)?.id,
            });
            
            logger.info(`Realtime event received`, { 
              table, 
              queryKey, 
              event: payload.eventType,
              recordId: (payload.new as Record<string, unknown>)?.id || (payload.old as Record<string, unknown>)?.id,
              schema: payload.schema
            }, 'Realtime');
            
            // Use refetchQueries instead of invalidateQueries for immediate updates
            queryClient.refetchQueries({ 
              predicate: (query) => query.queryKey[0] === queryKey,
              type: 'active', // Only refetch currently active queries
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
        
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const newStatus: ConnectionStatus = retryCountRef.current >= 3 ? 'error' : 'disconnected';
          setConnectionStatus(newStatus);
          
          // Update registry status
          const existing = activeChannels.get(channelKey);
          if (existing) existing.status = newStatus;
          
          // Only log error once to avoid spam
          if (!hasLoggedErrorRef.current) {
            logger.warn('Realtime subscription failed - falling back to polling', { 
              tables: configs.map(c => c.table),
              status,
              channelName
            }, 'Realtime');
            hasLoggedErrorRef.current = true;
          }

          // Stop retrying after 3 attempts - just use polling
          if (retryCountRef.current >= 3) {
            logger.debug('Max retries reached, using polling mode with 30s auto-retry', { 
              tables: configs.map(c => c.table) 
            }, 'Realtime');
            return; // No more immediate retries, auto-retry interval will handle it
          }

          // Exponential backoff retry
          const delay = Math.pow(2, retryCountRef.current) * 1000; // 1s, 2s, 4s
          logger.debug(`Retrying subscription in ${delay}ms`, { 
            attempt: retryCountRef.current + 1,
            tables: configs.map(c => c.table) 
          }, 'Realtime');
          
          retryTimeoutRef.current = setTimeout(() => {
            retryCountRef.current++;
            setConnectionStatus('connecting');
            setupSubscription();
          }, delay);
        } else if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          retryCountRef.current = 0; // Reset retry count on success
          hasLoggedErrorRef.current = false; // Reset error log flag
          
          // Register this channel in the global registry
          activeChannels.set(channelKey, { channel, refCount: 1, status: 'connected' });
          
          // PROMINENT LOG to verify subscription is active
          console.log('🔌 [REALTIME] Connected!', {
            channelName,
            tables: configs.map(c => c.table),
            queryKeys: configs.map(c => c.queryKey),
            totalActiveChannels: activeChannels.size
          });
          
          logger.info('Successfully subscribed to realtime', { 
            channelName,
            channelKey,
            tables: configs.map(c => c.table),
            activeSubscriptions: activeChannels.size
          }, 'Realtime');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
          const existing = activeChannels.get(channelKey);
          if (existing) existing.status = 'disconnected';
        }
      });

      channelRef.current = channel;
    };

    // Store ref for forceReconnect to use
    setupSubscriptionRef.current = setupSubscription;
    
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
  }, [enabled, configs.length, queryClient, channelKey, channelName]);

  // Auto-retry every 30 seconds when in error state (use refs to avoid dependency loops)
  useEffect(() => {
    if (connectionStatus === 'error' && enabled) {
      logger.debug('Starting auto-retry interval (30s)', { channelKey: channelKeyRef.current }, 'Realtime');
      
      autoRetryIntervalRef.current = setInterval(() => {
        logger.info('Auto-retry: Attempting reconnection...', { channelKey: channelKeyRef.current }, 'Realtime');
        forceReconnectRef.current();
      }, 30000); // 30 seconds
      
      return () => {
        if (autoRetryIntervalRef.current) {
          clearInterval(autoRetryIntervalRef.current);
        }
      };
    }
  }, [connectionStatus, enabled]); // Removed forceReconnect and channelKey - use refs

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    forceReconnect
  };
};
