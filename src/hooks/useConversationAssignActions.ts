import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

const RECENT_KEY = 'conversation-recent-assignees';
const RECENT_LIMIT = 3;

/** Profile IDs of the most recently used assignees (most recent first). */
export function getRecentAssigneeIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string').slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

function rememberAssignee(profileId: string) {
  try {
    const next = [profileId, ...getRecentAssigneeIds().filter((id) => id !== profileId)].slice(0, RECENT_LIMIT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Quick-assign actions shared by the conversation list and live chat list
 * right-click menus. `assigned_to` stores a profile id (not an auth user id).
 */
export function useConversationAssignActions() {
  const queryClient = useQueryClient();

  const assign = useCallback(
    async (conversationId: string, profileId: string | null, displayName?: string) => {
      try {
        const { error } = await supabase
          .from('conversations')
          .update({ assigned_to_id: profileId })
          .eq('id', conversationId);

        if (error) throw error;

        if (profileId) rememberAssignee(profileId);
        toast.success(profileId ? `Assigned to ${displayName || 'agent'}` : 'Assignment cleared');

        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
        queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      } catch (error) {
        logger.error('Failed to assign conversation', error, 'useConversationAssignActions');
        toast.error('Failed to assign conversation');
      }
    },
    [queryClient],
  );

  return { assign };
}
