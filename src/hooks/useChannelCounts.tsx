import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChannelCounts {
  email: number;
  facebook: number;
  instagram: number;
  whatsapp: number;
}

export const useChannelCounts = () => {
  return useQuery({
    queryKey: ['channel-counts'],
    queryFn: async (): Promise<ChannelCounts> => {
      const { data, error } = await supabase.rpc('get_conversations');
      if (error) {
        console.error('Error fetching channel counts:', error);
        return {
          email: 0,
          facebook: 0,
          instagram: 0,
          whatsapp: 0
        };
      }

      const conversations = (data || []) as any[];
      
      return {
        email: conversations.filter((conv: any) => conv.channel === 'email').length,
        facebook: conversations.filter((conv: any) => conv.channel === 'facebook').length,
        instagram: conversations.filter((conv: any) => conv.channel === 'instagram').length,
        whatsapp: conversations.filter((conv: any) => conv.channel === 'whatsapp').length,
      };
    },
    refetchInterval: 300000, // Refetch every 5 minutes (reduced from 30 seconds)
    staleTime: 120000, // Consider data stale after 2 minutes
  });
};