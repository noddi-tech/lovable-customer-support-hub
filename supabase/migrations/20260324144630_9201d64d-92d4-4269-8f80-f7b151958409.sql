-- Backfill conversations.updated_at from the latest message created_at
UPDATE public.conversations c
SET updated_at = sub.latest_msg
FROM (
  SELECT conversation_id, MAX(created_at) AS latest_msg
  FROM public.messages
  GROUP BY conversation_id
) sub
WHERE c.id = sub.conversation_id
  AND sub.latest_msg IS NOT NULL;

-- Update the trigger to also set updated_at on new message insert
CREATE OR REPLACE FUNCTION public.update_conversation_preview()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_is_internal = NEW.is_internal,
    preview_text = CASE 
      WHEN NEW.is_internal = true THEN preview_text
      ELSE LEFT(strip_html_tags(NEW.content), 200)
    END,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;