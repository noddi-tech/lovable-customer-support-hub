import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VisitorOnlineStatus {
  isOnline: boolean;
  lastSeenAt: string | null;
  status: 'waiting' | 'active' | 'ended' | 'abandoned' | null;
  hasLeft: boolean;
}

export function useVisitorOnlineStatus(conversationId: string | null): { 
  data: VisitorOnlineStatus | undefined;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['visitor-online-status', conversationId],
    queryFn: async (): Promise<VisitorOnlineStatus> => {
      if (!conversationId) {
        return { isOnline: false, lastSeenAt: null, status: null, hasLeft: false };
      }

      const { data, error } = await supabase
        .from('widget_chat_sessions')
        .select('last_seen_at, status')
        .eq('conversation_id', conversationId)
        .in('status', ['waiting', 'active', 'ended', 'abandoned'])
        .maybeSingle();

      if (error) {
        console.error('[useVisitorOnlineStatus] Query error:', error);
        return { isOnline: false, lastSeenAt: null, status: null, hasLeft: false };
      }

      if (!data) {
        return { isOnline: false, lastSeenAt: null, status: null, hasLeft: false };
      }

      const lastSeen = data.last_seen_at ? new Date(data.last_seen_at) : null;
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      
      // Check if visitor has left
      const hasLeft = data.status === 'ended' || data.status === 'abandoned';
      
      // Consider online if:
      // 1. Session is active (not just waiting)
      // 2. Last seen within 30 seconds
      // 3. Has not left
      const isOnline = lastSeen !== null && 
                       lastSeen > thirtySecondsAgo && 
                       data.status === 'active' &&
                       !hasLeft;

      return { 
        isOnline, 
        lastSeenAt: data.last_seen_at,
        status: data.status as VisitorOnlineStatus['status'],
        hasLeft,
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
