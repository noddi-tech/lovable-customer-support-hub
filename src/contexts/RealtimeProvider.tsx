import React, { createContext, useContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useSimpleRealtimeSubscriptions, ConnectionStatus } from '@/hooks/useSimpleRealtimeSubscriptions';
import { toast } from 'sonner';

interface RealtimeContextValue {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  forceReconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({ 
  isConnected: false, 
  connectionStatus: 'connecting',
  forceReconnect: () => {}
});

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Single subscription point for the entire app
  // Subscribes to ALL critical tables that need real-time updates
  // This consolidates subscriptions that were previously scattered across hooks
  const { isConnected, connectionStatus, forceReconnect } = useSimpleRealtimeSubscriptions([
    // Conversations & Messages
    { table: 'conversations', queryKey: 'conversations' },
    { table: 'messages', queryKey: 'messages' },
    { table: 'messages', queryKey: 'thread-messages' },
    { table: 'messages', queryKey: 'conversation-messages' },
    { table: 'customers', queryKey: 'customers' },
    // Notifications
    { table: 'notifications', queryKey: 'notifications' },
    // Voice/Calls - consolidated from useCalls, useVoicemails, useCallbackRequests
    { table: 'calls', queryKey: 'calls' },
    { table: 'call_events', queryKey: 'call-events' },
    { table: 'internal_events', queryKey: 'voicemails' },
    { table: 'internal_events', queryKey: 'callback-requests' },
  ], true);

  // Track previous status to detect recovery
  const previousStatusRef = useRef<ConnectionStatus>('connecting');

  useEffect(() => {
    const wasDisconnected = previousStatusRef.current === 'disconnected' || 
                            previousStatusRef.current === 'error';
    const isNowConnected = connectionStatus === 'connected';
    
    if (wasDisconnected && isNowConnected) {
      toast.success('Live updates restored', {
        description: 'Real-time connection has been re-established.',
        duration: 3000,
      });
    }
    
    previousStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  // Memoize forceReconnect to prevent unnecessary re-renders
  const memoizedForceReconnect = useCallback(() => {
    forceReconnect();
  }, [forceReconnect]);

  return (
    <RealtimeContext.Provider value={{ isConnected, connectionStatus, forceReconnect: memoizedForceReconnect }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeConnection = () => useContext(RealtimeContext);
