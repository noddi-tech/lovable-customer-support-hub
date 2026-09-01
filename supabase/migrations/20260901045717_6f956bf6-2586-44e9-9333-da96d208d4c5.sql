CREATE OR REPLACE FUNCTION public.mark_notifications_read_on_conversation_close()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status = 'closed' AND COALESCE(OLD.status, '') IS DISTINCT FROM 'closed')
     OR (COALESCE(NEW.is_archived, false) = true AND COALESCE(OLD.is_archived, false) = false) THEN
    UPDATE public.notifications
       SET is_read = true, updated_at = now()
     WHERE is_read = false
       AND (data->>'conversation_id')::text = NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_notifications_read_on_conversation_close ON public.conversations;
CREATE TRIGGER trg_mark_notifications_read_on_conversation_close
AFTER UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.mark_notifications_read_on_conversation_close();

CREATE OR REPLACE FUNCTION public.mark_notifications_read_on_chat_resolved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('resolved', 'closed', 'ended', 'abandoned')
     AND COALESCE(OLD.status, '') IS DISTINCT FROM NEW.status THEN
    UPDATE public.notifications
       SET is_read = true, updated_at = now()
     WHERE is_read = false
       AND (
         (NEW.conversation_id IS NOT NULL AND (data->>'conversation_id')::text = NEW.conversation_id::text)
         OR (data->>'session_id')::text = NEW.id::text
       );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_notifications_read_on_chat_resolved ON public.widget_chat_sessions;
CREATE TRIGGER trg_mark_notifications_read_on_chat_resolved
AFTER UPDATE ON public.widget_chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.mark_notifications_read_on_chat_resolved();