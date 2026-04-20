import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useMentionNotifications, MentionContext } from '@/hooks/useMentionNotifications';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { noteDebug } from '@/utils/noteInteractionDebug';

interface UpdateNoteArgs {
  messageId: string;
  content: string;
  mentionedUserIds: string[];
  previousMentionedUserIds?: string[];
  conversationId?: string;
  context?: MentionContext;
}

/**
 * Mutations for editing/deleting internal notes (messages with is_internal=true).
 *
 * Permission rule (app-level guard; RLS still applies):
 *   - The note's author (sender_id === auth user id), OR
 *   - An organization admin.
 *
 * Edits do NOT bump the conversation's updated_at (timestamp integrity rule).
 * Deletes also avoid touching conversations.updated_at.
 */
export const useNoteMutations = () => {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const { processMentions } = useMentionNotifications();
  const queryClient = useQueryClient();

  const canEditNote = useCallback(
    (note: { is_internal?: boolean | null; sender_id?: string | null } | null | undefined) => {
      if (!note || !user) return false;
      if (!note.is_internal) return false;
      return note.sender_id === user.id || isAdmin();
    },
    [user, isAdmin]
  );

  const invalidateMessageCaches = useCallback(
    (conversationId?: string) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['thread-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['thread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    [queryClient]
  );

  const updateNote = useCallback(
    async ({
      messageId,
      content,
      mentionedUserIds,
      previousMentionedUserIds = [],
      conversationId,
      context,
    }: UpdateNoteArgs) => {
      noteDebug('update_mutation_started', { messageId, mentionCount: mentionedUserIds.length }, 'useNoteMutations');
      try {
        const { error } = await supabase
          .from('messages')
          .update({
            content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', messageId)
          .eq('is_internal', true);

        if (error) throw error;

        // Notify only newly added mentions (avoid duplicates).
        const newlyMentioned = mentionedUserIds.filter(
          (id) => !previousMentionedUserIds.includes(id)
        );
        if (newlyMentioned.length > 0 && context) {
          await processMentions(content, newlyMentioned, context);
        }

        invalidateMessageCaches(conversationId);
        noteDebug('update_mutation_finished', { messageId, ok: true }, 'useNoteMutations');
        toast.success('Note updated');
        return true;
      } catch (err: any) {
        logger.error('Failed to update note', err, 'useNoteMutations');
        noteDebug('update_mutation_finished', { messageId, ok: false, error: err?.message }, 'useNoteMutations');
        toast.error(err?.message || 'Failed to update note');
        return false;
      }
    },
    [processMentions, invalidateMessageCaches]
  );

  const deleteNote = useCallback(
    async (messageId: string, conversationId?: string) => {
      noteDebug('delete_mutation_started', { messageId, conversationId }, 'useNoteMutations');
      try {
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', messageId)
          .eq('is_internal', true);

        if (error) throw error;

        invalidateMessageCaches(conversationId);
        noteDebug('delete_mutation_finished', { messageId, ok: true }, 'useNoteMutations');
        toast.success('Note deleted');
        return true;
      } catch (err: any) {
        logger.error('Failed to delete note', err, 'useNoteMutations');
        noteDebug('delete_mutation_finished', { messageId, ok: false, error: err?.message }, 'useNoteMutations');
        toast.error(err?.message || 'Failed to delete note');
        return false;
      }
    },
    [invalidateMessageCaches]
  );

  return { canEditNote, updateNote, deleteNote };
};

/** Extract mention names from @[Name] delimiter format in stored content. */
export const extractMentionNames = (content: string): string[] => {
  const pattern = /@\[([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)\]/g;
  const names: string[] = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    names.push(match[1].trim());
  }
  return names;
};
