import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribe to typing indicators for a conversation.
 * Returns a Set of user_ids currently typing.
 */
export function useConversationTypingStatus(conversationId: string | null): Set<string> {
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!conversationId) {
      setTypingUserIds(new Set());
      return;
    }

    // Initial fetch
    const fetchTyping = async () => {
      const { data } = await supabase
        .from('chat_typing_indicators')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('is_typing', true)
        .not('user_id', 'is', null);

      if (data) {
        setTypingUserIds(new Set(data.map((r) => r.user_id!)));
      }
    };
    fetchTyping();

    // Realtime subscription
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string | null; is_typing: boolean | null } | undefined;
          if (!row?.user_id) return;
          setTypingUserIds((prev) => {
            const next = new Set(prev);
            if (row.is_typing) {
              next.add(row.user_id!);
            } else {
              next.delete(row.user_id!);
            }
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId]);

  return typingUserIds;
}
