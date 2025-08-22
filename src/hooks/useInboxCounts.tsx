import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InboxData {
  id: string;
  name: string;
  color: string;
  conversation_count: number;
  is_active: boolean;
}

export const useInboxCounts = () => {
  return useQuery({
    queryKey: ['inbox-counts'],
    queryFn: async (): Promise<InboxData[]> => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) {
        console.error('Error fetching inbox counts:', error);
        return [];
      }
      return (data as InboxData[]) || [];
    },
    refetchInterval: 300000, // Refetch every 5 minutes (reduced from 30 seconds)
    staleTime: 120000, // Consider data stale after 2 minutes
  });
};