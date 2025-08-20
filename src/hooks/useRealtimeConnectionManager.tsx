import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

const DEFAULT_CONFIG: ReconnectionConfig = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
};

export const useRealtimeConnectionManager = () => {
  const { toast } = useToast();
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    lastConnected: null,
    connectionAttempts: 0,
    subscriptions: new Map()
  });
  
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectionConfigRef = useRef<ReconnectionConfig>(DEFAULT_CONFIG);
  const hasShownDisconnectToast = useRef(false);
  const pendingSubscriptions = useRef<Array<() => any>>([]);

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
    const currentAttempts = connectionState.connectionAttempts;

    if (currentAttempts >= config.maxRetries) {
      console.error('🔴 Max reconnection attempts reached');
      toast({
        title: "Connection Failed",
        description: "Unable to restore real-time connection. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    const delay = calculateBackoffDelay(currentAttempts + 1);
    console.log(`🔄 Attempting reconnection in ${delay}ms (attempt ${currentAttempts + 1}/${config.maxRetries})`);

    setConnectionState(prev => ({
      ...prev,
      connectionAttempts: prev.connectionAttempts + 1
    }));

    reconnectionTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Executing reconnection attempt...');
      reconnectAllSubscriptions();
    }, delay);
  }, [connectionState.connectionAttempts]);

  const reconnectAllSubscriptions = useCallback(() => {
    console.log('🔄 Reconnecting all subscriptions...');
    
    // Clear existing subscriptions
    connectionState.subscriptions.forEach((channel, channelName) => {
      console.log(`🧹 Cleaning up channel: ${channelName}`);
      supabase.removeChannel(channel);
    });

    setConnectionState(prev => ({
      ...prev,
      subscriptions: new Map()
    }));

    // Recreate all pending subscriptions
    pendingSubscriptions.current.forEach(createSubscription => {
      try {
        createSubscription();
      } catch (error) {
        console.error('Error recreating subscription:', error);
      }
    });
  }, [connectionState.subscriptions]);

  const handleConnectionStatus = useCallback((status: string, channelName: string) => {
    console.log(`📡 Channel ${channelName} status: ${status}`);
    
    if (status === 'SUBSCRIBED') {
      if (!connectionState.isConnected || hasShownDisconnectToast.current) {
        console.log('✅ Real-time connection restored');
        
        setConnectionState(prev => ({
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
        if (hasShownDisconnectToast.current) {
          toast({
            title: "Connection Restored",
            description: "Real-time updates are now working",
          });
          hasShownDisconnectToast.current = false;
        }
      }
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      if (connectionState.isConnected) {
        console.log('🔴 Real-time connection lost');
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: false
        }));

        // Show disconnect toast only once
        if (!hasShownDisconnectToast.current) {
          toast({
            title: "Connection Lost",
            description: "Real-time updates have been disconnected. Attempting to reconnect...",
            variant: "destructive",
          });
          hasShownDisconnectToast.current = true;
        }

        // Start reconnection process
        attemptReconnection();
      }
    }
  }, [connectionState.isConnected, attemptReconnection, toast]);

  const createManagedSubscription = useCallback((
    channelName: string,
    subscriptionFn: (channel: any) => any,
    dependencies: any[] = []
  ) => {
    const createSubscription = () => {
      console.log(`🔌 Creating managed subscription: ${channelName}`);
      
      const channel = subscriptionFn(supabase.channel(channelName));
      
      // Store the subscription creator for reconnection
      pendingSubscriptions.current = pendingSubscriptions.current.filter(
        fn => fn.name !== subscriptionFn.name
      );
      pendingSubscriptions.current.push(createSubscription);

      channel.subscribe((status: string) => {
        handleConnectionStatus(status, channelName);
      });

      setConnectionState(prev => ({
        ...prev,
        subscriptions: new Map(prev.subscriptions.set(channelName, channel))
      }));

      return () => {
        console.log(`🧹 Removing managed subscription: ${channelName}`);
        supabase.removeChannel(channel);
        setConnectionState(prev => {
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
      
      connectionState.subscriptions.forEach((channel, channelName) => {
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
    forceReconnect: reconnectAllSubscriptions
  };
};