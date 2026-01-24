import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VisitorOnlineStatus {
  isOnline: boolean;
  lastSeenAt: string | null;
  status: 'waiting' | 'active' | 'ended' | 'abandoned' | null;
}

export function useVisitorOnlineStatus(conversationId: string | null): { 
  data: VisitorOnlineStatus | undefined;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['visitor-online-status', conversationId],
    queryFn: async (): Promise<VisitorOnlineStatus> => {
      if (!conversationId) {
        return { isOnline: false, lastSeenAt: null, status: null };
      }

      const { data, error } = await supabase
        .from('widget_chat_sessions')
        .select('last_seen_at, status')
        .eq('conversation_id', conversationId)
        .in('status', ['waiting', 'active'])
        .maybeSingle();

      if (error) {
        console.error('[useVisitorOnlineStatus] Query error:', error);
        return { isOnline: false, lastSeenAt: null, status: null };
      }

      if (!data) {
        return { isOnline: false, lastSeenAt: null, status: null };
      }

      const lastSeen = data.last_seen_at ? new Date(data.last_seen_at) : null;
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      
      // Consider online if:
      // 1. Session is active (not just waiting)
      // 2. Last seen within 30 seconds
      const isOnline = lastSeen !== null && 
                       lastSeen > thirtySecondsAgo && 
                       data.status === 'active';

      return { 
        isOnline, 
        lastSeenAt: data.last_seen_at,
        status: data.status as VisitorOnlineStatus['status']
      };
    },
    refetchInterval: 5000, // Poll every 5 seconds
    enabled: !!conversationId,
    staleTime: 3000, // Consider data stale after 3 seconds
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
  };
}
