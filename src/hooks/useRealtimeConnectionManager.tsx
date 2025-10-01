import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Global state to share across all instances
let globalConnectionState = {
  isConnected: false,
  lastConnected: null as Date | null,
  connectionAttempts: 0,
  subscriptions: new Map()
};

let globalStateListeners = new Set<(state: any) => void>();

const updateGlobalState = (updater: (prev: any) => any) => {
  globalConnectionState = updater(globalConnectionState);
  globalStateListeners.forEach(listener => listener(globalConnectionState));
};

interface ConnectionState {
  isConnected: boolean;
  lastConnected: Date | null;
  connectionAttempts: number;
  subscriptions: Map<string, any>;
}

interface ReconnectionConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  statusDebounceMs: number;
  toastRateLimitMs: number;
}

const DEFAULT_CONFIG: ReconnectionConfig = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  statusDebounceMs: 2000, // 2 seconds debounce for status changes
  toastRateLimitMs: 5000, // Minimum 5 seconds between toasts
};

export const useRealtimeConnectionManager = () => {
  const { toast } = useToast();
  const [connectionState, setConnectionState] = useState<ConnectionState>(globalConnectionState);
  
  // Subscribe to global state changes
  useEffect(() => {
    const listener = (newState: ConnectionState) => {
      setConnectionState(newState);
    };
    globalStateListeners.add(listener);
    
    return () => {
      globalStateListeners.delete(listener);
    };
  }, []);
  
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectionConfigRef = useRef<ReconnectionConfig>(DEFAULT_CONFIG);
  const hasShownDisconnectToast = useRef(false);
  const pendingSubscriptions = useRef<Array<() => any>>([]);
  
  // Add debouncing and rate limiting refs
  const statusDebounceTimeoutRef = useRef<NodeJS.Timeout>();
  const currentConnectionStateRef = useRef(false);
  const lastToastTimeRef = useRef<{ disconnect: number; reconnect: number }>({
    disconnect: 0,
    reconnect: 0
  });

  // Debug: Log when the connection manager initializes
  useEffect(() => {
    console.log('🔧 Realtime Connection Manager initialized - CONSOLIDATING');
    return () => {
      console.log('🔧 Realtime Connection Manager destroyed - CONSOLIDATING');
    };
  }, []);

  const calculateBackoffDelay = (attempt: number): number => {
    const config = reconnectionConfigRef.current;
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  };

  const attemptReconnection = useCallback(() => {
    if (reconnectionTimeoutRef.current) {
      clearTimeout(reconnectionTimeoutRef.current);
    }

    const config = reconnectionConfigRef.current;
    
    updateGlobalState(prev => {
      const currentAttempts = prev.connectionAttempts;
      
      if (currentAttempts >= config.maxRetries) {
        console.error('🔴 Max reconnection attempts reached');
        toast({
          title: "Connection Failed",
          description: "Unable to restore real-time connection. Please refresh the page.",
          variant: "destructive",
        });
        return prev;
      }

      const delay = calculateBackoffDelay(currentAttempts + 1);
      console.log(`🔄 Attempting reconnection in ${delay}ms (attempt ${currentAttempts + 1}/${config.maxRetries})`);

      reconnectionTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Executing reconnection attempt...');
        reconnectAllSubscriptions();
      }, delay);

      return {
        ...prev,
        connectionAttempts: prev.connectionAttempts + 1
      };
    });
  }, [toast]);

  const reconnectAllSubscriptions = useCallback(() => {
    console.log('🔄 Reconnecting all subscriptions...');
    
    updateGlobalState(prev => {
      // Clear existing subscriptions
      prev.subscriptions.forEach((channel, channelName) => {
        console.log(`🧹 Cleaning up channel: ${channelName}`);
        supabase.removeChannel(channel);
      });

      // Recreate all pending subscriptions
      pendingSubscriptions.current.forEach(createSubscription => {
        try {
          createSubscription();
        } catch (error) {
          console.error('Error recreating subscription:', error);
        }
      });

      return {
        ...prev,
        subscriptions: new Map()
      };
    });
  }, []);

  const handleConnectionStatus = useCallback((status: string, channelName: string) => {
    console.log(`📡 Channel ${channelName} status: ${status}`);
    
    const config = reconnectionConfigRef.current;
    const now = Date.now();
    
    if (status === 'SUBSCRIBED') {
      // For initial connections or successful reconnections, act immediately
      if (!currentConnectionStateRef.current) {
        console.log('✅ Real-time connection established');
        
        currentConnectionStateRef.current = true;
        updateGlobalState(prev => ({
          ...prev,
          isConnected: true,
          lastConnected: new Date(),
          connectionAttempts: 0
        }));

        // Clear reconnection timeout
        if (reconnectionTimeoutRef.current) {
          clearTimeout(reconnectionTimeoutRef.current);
          reconnectionTimeoutRef.current = undefined;
        }

        // Show restoration toast only if we previously showed a disconnect toast
        // and enough time has passed since the last toast
        if (hasShownDisconnectToast.current && 
            now - lastToastTimeRef.current.reconnect > config.toastRateLimitMs) {
          toast({
            title: "Connection Restored",
            description: "Real-time updates are now working",
          });
          hasShownDisconnectToast.current = false;
          lastToastTimeRef.current.reconnect = now;
        }
      }
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      // Only debounce disconnection events to prevent flapping
      if (currentConnectionStateRef.current) {
        // Clear any pending debounce timeout for disconnections
        if (statusDebounceTimeoutRef.current) {
          clearTimeout(statusDebounceTimeoutRef.current);
        }
        
        // Update connection state immediately (before the timeout check)
        currentConnectionStateRef.current = false;
        statusDebounceTimeoutRef.current = setTimeout(() => {
          // Double-check we're still disconnected after the debounce period
          if (currentConnectionStateRef.current) return; // If we reconnected, don't process disconnect
          
          console.log(`🔴 Real-time connection lost (${status})`);
          
          updateGlobalState(prev => ({
            ...prev,
            isConnected: false
          }));

          // Show disconnect toast only if enough time has passed since the last one
          if (!hasShownDisconnectToast.current && 
              now - lastToastTimeRef.current.disconnect > config.toastRateLimitMs) {
            toast({
              title: "Connection Lost",
              description: "Real-time updates have been disconnected. Attempting to reconnect...",
              variant: "destructive",
            });
            hasShownDisconnectToast.current = true;
            lastToastTimeRef.current.disconnect = now;
          }

          // Start reconnection process
          attemptReconnection();
        }, config.statusDebounceMs);
      }
    }
  }, [toast, attemptReconnection]);

  const createManagedSubscription = useCallback((
    channelName: string,
    subscriptionFn: (channel: any) => any,
    dependencies: any[] = []
  ) => {
    const createSubscription = () => {
      console.log(`[RealtimeConnectionManager] 🔌 Creating managed subscription: ${channelName}`, {
        timestamp: new Date().toISOString(),
        existingSubscriptions: globalConnectionState.subscriptions.size
      });
      
      const channel = subscriptionFn(supabase.channel(channelName));
      
      // Store the subscription creator for reconnection
      pendingSubscriptions.current = pendingSubscriptions.current.filter(
        fn => fn.name !== subscriptionFn.name
      );
      pendingSubscriptions.current.push(createSubscription);

      console.log(`[RealtimeConnectionManager] 📡 Subscribing to channel: ${channelName}`);
      channel.subscribe((status: string) => {
        console.log(`[RealtimeConnectionManager] 🔄 Channel ${channelName} status: ${status}`, {
          timestamp: new Date().toISOString(),
          isConnected: globalConnectionState.isConnected
        });
        handleConnectionStatus(status, channelName);
      });

      updateGlobalState(prev => ({
        ...prev,
        subscriptions: new Map(prev.subscriptions.set(channelName, channel))
      }));

      console.log(`[RealtimeConnectionManager] ✅ Subscription stored for: ${channelName}`, {
        totalSubscriptions: globalConnectionState.subscriptions.size + 1
      });

      return () => {
        console.log(`[RealtimeConnectionManager] 🧹 Removing managed subscription: ${channelName}`);
        supabase.removeChannel(channel);
        updateGlobalState(prev => {
          const newSubscriptions = new Map(prev.subscriptions);
          newSubscriptions.delete(channelName);
          return {
            ...prev,
            subscriptions: newSubscriptions
          };
        });
        
        // Remove from pending subscriptions
        pendingSubscriptions.current = pendingSubscriptions.current.filter(
          fn => fn !== createSubscription
        );
      };
    };

    return createSubscription();
  }, [handleConnectionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
      }
      
      if (statusDebounceTimeoutRef.current) {
        clearTimeout(statusDebounceTimeoutRef.current);
      }
      
      // Use the global state for cleanup
      globalConnectionState.subscriptions.forEach((channel, channelName) => {
        console.log(`🧹 Final cleanup of channel: ${channelName}`);
        supabase.removeChannel(channel);
      });
    };
  }, []);

  return {
    isConnected: connectionState.isConnected,
    lastConnected: connectionState.lastConnected,
    connectionAttempts: connectionState.connectionAttempts,
    createManagedSubscription,
    forceReconnect: reconnectAllSubscriptions,
    // Debug info
    subscriptionCount: connectionState.subscriptions.size,
    subscriptionNames: Array.from(connectionState.subscriptions.keys())
  };
};