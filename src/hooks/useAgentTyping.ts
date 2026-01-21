import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseAgentTypingOptions {
  conversationId: string | null;
  enabled?: boolean;
}

export function useAgentTyping({ conversationId, enabled = true }: UseAgentTypingOptions) {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  // Fetch user ID once
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      userIdRef.current = user?.id || null;
    };
    fetchUserId();
  }, []);

  const sendTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !enabled || !userIdRef.current) return;
    
    // Only send if status actually changed
    if (lastTypingRef.current === isTyping) return;
    lastTypingRef.current = isTyping;

    try {
      await supabase
        .from('chat_typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: userIdRef.current,
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
  }, [conversationId, enabled]);

  const handleTyping = useCallback(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true
    sendTypingStatus(true);

    // Auto-clear after 3 seconds of no typing
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
      // Send stop typing on cleanup
      if (lastTypingRef.current && conversationId && userIdRef.current) {
        // Fire and forget - no need to await or catch
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
