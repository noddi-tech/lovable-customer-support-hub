-- Add updated_at column (default handles new + existing rows)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill in case column already existed with NULLs from a prior partial run
UPDATE public.messages
SET updated_at = created_at
WHERE updated_at IS NULL OR updated_at > created_at + interval '1 second';

-- Auto-bump trigger
CREATE OR REPLACE FUNCTION public.set_messages_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
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

-- Refine update_conversation_preview: skip stale-preview overwrites on edits of older messages
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
      updated_at = NEW.created_at,
      last_message_is_internal = COALESCE(NEW.is_internal, false),
      last_message_sender_type = NEW.sender_type
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;