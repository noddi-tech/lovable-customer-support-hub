import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseVisitorTypingResult {
  isTyping: boolean;
}

export function useVisitorTyping(conversationId: string | null): UseVisitorTypingResult {
  const { data } = useQuery({
    queryKey: ['visitor-typing', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from('chat_typing_indicators')
        .select('is_typing, updated_at')
        .eq('conversation_id', conversationId)
        .not('visitor_id', 'is', null) // Only visitor typing, not agent
        .maybeSingle();

      if (error) {
        console.error('[useVisitorTyping] Error fetching typing status:', error);
        return null;
      }

      return data;
    },
    enabled: !!conversationId,
    refetchInterval: 2000, // Poll every 2 seconds
    staleTime: 1000,
  });

  // Check if typing indicator is stale (older than 5 seconds)
  const isTyping = (() => {
    if (!data?.is_typing || !data?.updated_at) return false;
    
    const updatedAt = new Date(data.updated_at).getTime();
    const now = Date.now();
    const staleThreshold = 5000; // 5 seconds
    
    return (now - updatedAt) < staleThreshold;
  })();

  return { isTyping };
}
