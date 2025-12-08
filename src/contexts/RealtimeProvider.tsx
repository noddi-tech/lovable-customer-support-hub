import React, { createContext, useContext, ReactNode } from 'react';
import { useSimpleRealtimeSubscriptions, ConnectionStatus } from '@/hooks/useSimpleRealtimeSubscriptions';

interface RealtimeContextValue {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
}

const RealtimeContext = createContext<RealtimeContextValue>({ 
  isConnected: false, 
  connectionStatus: 'connecting' 
});

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Single subscription point for the entire app
  // Subscribes to ALL critical tables that need real-time updates
  // This consolidates subscriptions that were previously scattered across hooks
  const { isConnected, connectionStatus } = useSimpleRealtimeSubscriptions([
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

  return (
    <RealtimeContext.Provider value={{ isConnected, connectionStatus }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeConnection = () => useContext(RealtimeContext);
