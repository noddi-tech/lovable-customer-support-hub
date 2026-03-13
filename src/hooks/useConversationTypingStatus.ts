import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ---- Local typing event bus (same-tab instant feedback) ----
type LocalTypingListener = (conversationId: string, userId: string, isTyping: boolean) => void;
const localListeners = new Set<LocalTypingListener>();

export function emitLocalTypingEvent(conversationId: string, userId: string, isTyping: boolean) {
  localListeners.forEach((fn) => fn(conversationId, userId, isTyping));
}

/**
 * Subscribe to typing indicators for a conversation.
 * Returns a Set of user_ids currently typing.
 * Merges local events (instant) with DB/realtime (cross-tab).
 */
export function useConversationTypingStatus(conversationId: string | null): Set<string> {
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());

  // Local event handler — instant same-tab feedback
  const handleLocalEvent: LocalTypingListener = useCallback(
    (cId, userId, isTyping) => {
      if (cId !== conversationId) return;
      setTypingUserIds((prev) => {
        const next = new Set(prev);
        if (isTyping) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    },
    [conversationId],
  );

  useEffect(() => {
    if (!conversationId) {
      setTypingUserIds(new Set());
      return;
    }

    // Register local listener
    localListeners.add(handleLocalEvent);

    // Initial fetch — ignore stale rows (>15s old)
    const fetchTyping = async () => {
      const cutoff = new Date(Date.now() - 15_000).toISOString();
      const { data } = await supabase
        .from('chat_typing_indicators')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('is_typing', true)
        .not('user_id', 'is', null)
        .gte('updated_at', cutoff);

      if (data) {
        setTypingUserIds(new Set(data.map((r) => r.user_id!)));
      }
    };
    fetchTyping();

    // Realtime subscription (cross-tab / cross-user)
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
      localListeners.delete(handleLocalEvent);
      channel.unsubscribe();
    };
  }, [conversationId, handleLocalEvent]);

  return typingUserIds;
}
