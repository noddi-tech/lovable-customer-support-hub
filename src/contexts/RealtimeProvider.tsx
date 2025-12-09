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

// CRITICAL: Define configs OUTSIDE the component to prevent recreation on every render
// This was causing constant re-subscriptions and connection instability
const REALTIME_CONFIGS = [
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
] as const;

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Single subscription point for the entire app
  // Subscribes to ALL critical tables that need real-time updates
  const { isConnected, connectionStatus, forceReconnect } = useSimpleRealtimeSubscriptions(
    REALTIME_CONFIGS as unknown as Array<{ table: string; queryKey: string }>,
    true
  );

  // Track previous status and whether we've already shown recovery toast
  const previousStatusRef = useRef<ConnectionStatus>('connecting');
  const hasShownRecoveryToastRef = useRef(false);

  useEffect(() => {
    const wasDisconnected = previousStatusRef.current === 'disconnected' || 
                            previousStatusRef.current === 'error';
    const isNowConnected = connectionStatus === 'connected';
    
    // Only show toast once per recovery cycle
    if (wasDisconnected && isNowConnected && !hasShownRecoveryToastRef.current) {
      hasShownRecoveryToastRef.current = true;
      toast.success('Live updates restored', {
        description: 'Real-time connection has been re-established.',
        duration: 3000,
      });
    }
    
    // Reset the flag when we go back to disconnected/error state
    if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
      hasShownRecoveryToastRef.current = false;
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
