import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import { useTeamMemberMentions } from '@/hooks/useTeamMemberMentions';
import { useNoteMutations, extractMentionNames } from '@/hooks/useNoteMutations';
import type { MentionContext } from '@/hooks/useMentionNotifications';
import { Loader2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { noteDebug } from '@/utils/noteInteractionDebug';

interface InlineNoteEditorProps {
  messageId: string;
  initialContent: string;
  conversationId?: string;
  context?: MentionContext;
  onCancel: () => void;
  onSaved?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Inline editor used to fix typos / add mentions on internal notes.
 * Reused by email view (MessageCard), chat view (ChatMessagesList),
 * and mobile chat (MobileChatBubble).
 */
export const InlineNoteEditor = ({
  messageId,
  initialContent,
  conversationId,
  context,
  onCancel,
  onSaved,
  className,
  compact,
}: InlineNoteEditorProps) => {
  const { members } = useTeamMemberMentions();
  const { updateNote } = useNoteMutations();
  const [value, setValue] = useState(initialContent);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const initialMentionIdsRef = useRef<string[]>([]);

  // Resolve initial mentions from the stored content (once members are loaded).
  useEffect(() => {
    if (members.length === 0) return;
    const names = extractMentionNames(initialContent);
    const ids: string[] = [];
    for (const name of names) {
      const match = members.find(
        (m) => m.full_name?.toLowerCase() === name.toLowerCase()
      );
      if (match && !ids.includes(match.user_id)) ids.push(match.user_id);
    }
    initialMentionIdsRef.current = ids;
    setMentionedUserIds(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length]);

  // Lifecycle tracking for the editor
  useEffect(() => {
    noteDebug('note_editor_mounted', { messageId, hasContext: !!context }, 'InlineNoteEditor');
    return () => {
      noteDebug('note_editor_unmounted', { messageId }, 'InlineNoteEditor');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!value.trim() || isSaving) return;
    if (value.trim() === initialContent.trim()) {
      onCancel();
      return;
    }
    setIsSaving(true);
    const ok = await updateNote({
      messageId,
      content: value,
      mentionedUserIds,
      previousMentionedUserIds: initialMentionIdsRef.current,
      conversationId,
      context,
    });
    setIsSaving(false);
    if (ok) {
      onSaved?.();
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    // Cmd/Ctrl+Enter to save (regular Enter inserts newline / picks mention).
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <MentionTextarea
        autoFocus
        value={value}
        onChange={(v, ids) => {
          setValue(v);
          setMentionedUserIds(ids);
        }}
        mentionedUserIds={mentionedUserIds}
        onKeyDown={handleKeyDown}
        className={cn(compact ? 'min-h-[60px] text-[13px]' : 'min-h-[80px] text-sm')}
        placeholder="Edit note... (Type @ to mention)"
      />
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
          className="h-7"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!value.trim() || isSaving}
          className="h-7"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5 mr-1" />
          )}
          Save
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Press <kbd className="px-1 py-0.5 rounded bg-muted">Esc</kbd> to cancel,{' '}
        <kbd className="px-1 py-0.5 rounded bg-muted">⌘/Ctrl + Enter</kbd> to save.
      </p>
    </div>
  );
};
