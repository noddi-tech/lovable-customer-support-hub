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
    { table: 'conversations', queryKey: 'conversations' },
    { table: 'notifications', queryKey: 'notifications' },
    { table: 'messages', queryKey: 'messages' },
    { table: 'customers', queryKey: 'customers' },
  ], true);

  return (
    <RealtimeContext.Provider value={{ isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeConnection = () => useContext(RealtimeContext);
