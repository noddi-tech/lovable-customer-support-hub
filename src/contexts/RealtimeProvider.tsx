import React, { createContext, useContext, ReactNode } from 'react';
import { useSimpleRealtimeSubscriptions } from '@/hooks/useSimpleRealtimeSubscriptions';

interface RealtimeContextValue {
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({ isConnected: false });

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Single subscription point for the entire app
  // Subscribes to all critical tables that need real-time updates
  const { isConnected } = useSimpleRealtimeSubscriptions([
    { table: 'conversations', queryKey: 'all-counts' },
    { table: 'notifications', queryKey: 'all-counts' },
    { table: 'messages', queryKey: 'thread-messages' },
    { table: 'customers', queryKey: 'calls' },
  ], true);

  return (
    <RealtimeContext.Provider value={{ isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeConnection = () => useContext(RealtimeContext);
