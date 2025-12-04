import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MentionContext {
  type: 'internal_note' | 'ticket_comment' | 'customer_note' | 'call_note';
  conversation_id?: string;
  ticket_id?: string;
  customer_id?: string;
  call_id?: string;
}

export const useMentionNotifications = () => {
  const { user, profile } = useAuth();

  const processMentions = useCallback(async (
    content: string,
    mentionedUserIds: string[],
    context: MentionContext
  ) => {
    if (!user || !profile || mentionedUserIds.length === 0) return;

    try {
      const { error } = await supabase.functions.invoke('process-mention-notifications', {
        body: {
          mentionedUserIds,
          mentionerUserId: user.id,
          mentionerName: profile.full_name,
          content,
          context,
        },
      });

      if (error) {
        console.error('Failed to process mention notifications:', error);
      }
    } catch (err) {
      console.error('Error processing mentions:', err);
    }
  }, [user, profile]);

  return { processMentions };
};
