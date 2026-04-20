

## Plan: Add `updated_at` to `messages` + fix preview trigger

### Root cause

`useNoteMutations.updateNote` writes `updated_at: new Date().toISOString()` to `messages`, but the `messages` table has no `updated_at` column. PostgREST returns "column not found in schema cache" and the edit fails.

### Fix

**1. Migration: add `updated_at` column + auto-bump trigger**

```sql
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill existing rows so "(edited)" badge logic (updated_at > created_at + small delta)
-- doesn't false-positive on historical messages.
UPDATE public.messages SET updated_at = created_at WHERE updated_at IS DISTINCT FROM created_at;

-- BEFORE UPDATE trigger to keep updated_at fresh automatically.
CREATE OR REPLACE FUNCTION public.set_messages_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_set_updated_at ON public.messages;
CREATE TRIGGER messages_set_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.set_messages_updated_at();
```

**2. Fix `update_conversation_preview` (incidental cleanup)**

Currently it overwrites `conversations.preview_text` / `last_message_*` on every UPDATE — including edits to old messages. Limit the preview update on UPDATE to cases where the edited message is still the latest in the thread:

```sql
CREATE OR REPLACE FUNCTION public.update_conversation_preview()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  preview text;
  latest_id uuid;
BEGIN
  -- On UPDATE, only refresh preview if this message is still the latest in the conversation.
  IF TG_OP = 'UPDATE' THEN
    SELECT id INTO latest_id
    FROM public.messages
    WHERE conversation_id = NEW.conversation_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF latest_id IS DISTINCT FROM NEW.id THEN
      RETURN NEW;
    END IF;
  END IF;

  preview := left(regexp_replace(NEW.content, '<[^>]+>', '', 'g'), 200);

  UPDATE conversations
  SET preview_text = preview,
      updated_at = NEW.created_at,        -- still uses created_at → no bump on edit ✓
      last_message_is_internal = COALESCE(NEW.is_internal, false),
      last_message_sender_type = NEW.sender_type
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;
```

This preserves the timestamp integrity rule (conversation `updated_at` never moves on edit, since `NEW.created_at` is unchanged) and stops stale-preview overwrites when editing older notes.

**3. No client code changes needed**

`useNoteMutations.updateNote` already sets `updated_at` explicitly — that still works (BEFORE trigger overrides it with `now()`, which is what we want). The "(edited)" badge logic in `MessageCard` / `ChatMessagesList` / `MobileChatBubble` already compares `updated_at` vs `created_at`, and the backfill ensures historical rows stay clean.

### Files touched

- New migration in `supabase/migrations/` (timestamp + add-column + trigger + backfill + replace `update_conversation_preview`).
- No frontend changes.

### Verification

1. After migration, reload the conversation in your screenshot.
2. Click **Save** on the open note editor → toast says "Note updated", bubble re-renders with the `@[Tom Arne Danielsen]` chip and an `(edited)` marker.
3. Conversation list ordering does NOT change (same `updated_at`).
4. Edit an OLDER note in a long thread → conversation preview text does NOT get clobbered with the older note's content.
5. Delete a note → row disappears, no errors.

