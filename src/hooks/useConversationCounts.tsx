import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ConversationCounts {
  all: number;
  unread: number;
  assigned: number;
  pending: number;
  closed: number;
  archived: number;
}

export const useConversationCounts = () => {
  return useQuery({
    queryKey: ['conversation-counts'],
    queryFn: async (): Promise<ConversationCounts> => {
      const { data, error } = await supabase.rpc('get_conversations');
      if (error) {
        console.error('Error fetching conversation counts:', error);
        return {
          all: 0,
          unread: 0,
          assigned: 0,
          pending: 0,
          closed: 0,
          archived: 0
        };
      }

      const conversations = (data || []) as any[];
      
      return {
        all: conversations.length,
        unread: conversations.filter((conv: any) => !conv.is_read).length,
        assigned: conversations.filter((conv: any) => conv.assigned_to?.id).length,
        pending: conversations.filter((conv: any) => conv.status === 'pending').length,
        closed: conversations.filter((conv: any) => conv.status === 'closed').length,
        archived: conversations.filter((conv: any) => conv.is_archived).length,
      };
    },
    refetchInterval: 300000, // Refetch every 5 minutes (reduced from 30 seconds)
    staleTime: 120000, // Consider data stale after 2 minutes
  });
};