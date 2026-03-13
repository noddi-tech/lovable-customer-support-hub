import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthContext';
import { emitLocalTypingEvent } from './useConversationTypingStatus';

interface UseAgentTypingOptions {
  conversationId: string | null;
  enabled?: boolean;
}

export function useAgentTyping({ conversationId, enabled = true }: UseAgentTypingOptions) {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingRef = useRef(false);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  const sendTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !enabled || !userId) return;
    
    // Only send if status actually changed
    if (lastTypingRef.current === isTyping) return;

    // Emit local event IMMEDIATELY for instant UI feedback
    emitLocalTypingEvent(conversationId, userId, isTyping);

    try {
      const { error } = await supabase
        .from('chat_typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: userId,
          visitor_id: null,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'conversation_id,user_id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('[useAgentTyping] Upsert error:', error.message, { conversationId, userId });
        // Don't commit state — allow retry on next keystroke
        return;
      }

      // Only commit after successful write
      lastTypingRef.current = isTyping;
    } catch (error) {
      console.error('[useAgentTyping] Exception:', error);
      // Don't commit — allow retry
    }
  }, [conversationId, enabled, userId]);

  const handleTyping = useCallback(() => {
    if (!enabled) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendTypingStatus(true);

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 3000);
  }, [sendTypingStatus, enabled]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTypingStatus(false);
  }, [sendTypingStatus]);

  // Cleanup on unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      const uid = userIdRef.current;
      if (lastTypingRef.current && conversationId && uid) {
        // Emit local event for immediate UI cleanup
        emitLocalTypingEvent(conversationId, uid, false);
        void supabase
          .from('chat_typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: uid,
            visitor_id: null,
            is_typing: false,
            updated_at: new Date().toISOString(),
          }, { 
            onConflict: 'conversation_id,user_id',
            ignoreDuplicates: false,
          });
      }
    };
  }, [conversationId]);

  return { handleTyping, stopTyping };
}
