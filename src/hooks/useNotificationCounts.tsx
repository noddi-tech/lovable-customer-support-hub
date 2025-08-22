import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useNotificationCounts = () => {
  return useQuery({
    queryKey: ['notification-counts'],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('is_read', false);
      
      if (error) {
        console.error('Error fetching notification counts:', error);
        return 0;
      }
      
      return data?.length || 0;
    },
    refetchInterval: 300000, // Refetch every 5 minutes (reduced from 30 seconds)
    staleTime: 120000, // Consider data stale after 2 minutes
  });
};