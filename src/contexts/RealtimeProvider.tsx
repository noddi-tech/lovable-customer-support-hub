import React, { createContext, useContext, ReactNode } from 'react';
import { useSimpleRealtimeSubscriptions } from '@/hooks/useSimpleRealtimeSubscriptions';

interface RealtimeContextValue {
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({ isConnected: false });

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Single subscription point for the entire app
  // Subscribes to ALL critical tables that need real-time updates
  // This consolidates subscriptions that were previously scattered across hooks
  const { isConnected } = useSimpleRealtimeSubscriptions([
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
    <RealtimeContext.Provider value={{ isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeConnection = () => useContext(RealtimeContext);
