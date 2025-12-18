import React, { createContext, useContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useSimpleRealtimeSubscriptions, ConnectionStatus } from '@/hooks/useSimpleRealtimeSubscriptions';
import { useQueryClient } from '@tanstack/react-query';
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
const REALTIME_CONFIGS: Array<{ table: string; queryKey: string }> = [
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
];

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  
  // Single subscription point for the entire app
  // Subscribes to ALL critical tables that need real-time updates
  const { isConnected, connectionStatus, forceReconnect } = useSimpleRealtimeSubscriptions(
    REALTIME_CONFIGS,
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

  // Debounce ref for visibility change handler
  const lastVisibilityChangeRef = useRef<number>(0);

  // Handle tab visibility changes - reconnect and refresh data when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Debounce: skip if less than 1 second since last visibility change
        const now = Date.now();
        if (now - lastVisibilityChangeRef.current < 1000) {
          return;
        }
        lastVisibilityChangeRef.current = now;

        console.log('[Realtime] Tab became visible, checking connection...');
        
        // Force reconnect if not connected
        if (connectionStatus !== 'connected') {
          console.log('[Realtime] Connection not active, forcing reconnect...');
          memoizedForceReconnect();
        }
        
        // Cancel any in-flight queries first to prevent CancelledError spam during dehydration
        await queryClient.cancelQueries({ queryKey: ['conversations'] });
        await queryClient.cancelQueries({ queryKey: ['notifications'] });
        await queryClient.cancelQueries({ queryKey: ['messages'] });
        
        // Then invalidate to trigger fresh refetch
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connectionStatus, memoizedForceReconnect, queryClient]);

  return (
    <RealtimeContext.Provider value={{ isConnected, connectionStatus, forceReconnect: memoizedForceReconnect }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeConnection = () => useContext(RealtimeContext);
