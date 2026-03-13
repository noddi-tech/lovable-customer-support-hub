import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthContext';

interface UseAgentTypingOptions {
  conversationId: string | null;
  enabled?: boolean;
}

export function useAgentTyping({ conversationId, enabled = true }: UseAgentTypingOptions) {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingRef = useRef(false);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // Keep a ref for cleanup (can't use state in effect cleanup)
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  const sendTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !enabled || !userId) return;
    
    // Only send if status actually changed
    if (lastTypingRef.current === isTyping) return;
    lastTypingRef.current = isTyping;

    try {
      await supabase
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
    } catch (error) {
      console.error('[useAgentTyping] Error updating typing status:', error);
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
      if (lastTypingRef.current && conversationId && userIdRef.current) {
        void supabase
          .from('chat_typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: userIdRef.current,
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
