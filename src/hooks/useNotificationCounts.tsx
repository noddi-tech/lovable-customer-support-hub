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
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 10000, // Consider data stale after 10 seconds
  });
};