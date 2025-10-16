import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 10, // 10 minutes default
      refetchOnWindowFocus: false, // Don't refetch when switching tabs
      refetchOnMount: false, // Don't automatically refetch on mount
      retry: 1, // Only retry once on failures
    },
  },
});

export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'NODDI_QUERY_CACHE',
});
