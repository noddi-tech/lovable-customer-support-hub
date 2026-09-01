-- Remember who last handled a conversation so a reopen can go back to them
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_assigned_to_id uuid;

UPDATE public.conversations
   SET last_assigned_to_id = assigned_to_id
 WHERE assigned_to_id IS NOT NULL AND last_assigned_to_id IS NULL;

CREATE OR REPLACE FUNCTION public.remember_conversation_assignee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.assigned_to_id IS NOT NULL THEN
    NEW.last_assigned_to_id := NEW.assigned_to_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_remember_conversation_assignee ON public.conversations;
CREATE TRIGGER trg_remember_conversation_assignee
BEFORE INSERT OR UPDATE OF assigned_to_id ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.remember_conversation_assignee();

-- Reopen (and restore the previous owner) whenever a customer replies on a
-- closed / resolved / pending thread, regardless of channel (email, sms, chat).
CREATE OR REPLACE FUNCTION public.reopen_conversation_on_customer_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prev uuid;
BEGIN
  IF NEW.sender_type <> 'customer' OR coalesce(NEW.is_internal, false) THEN
    RETURN NEW;
  END IF;

  SELECT c.last_assigned_to_id INTO v_prev
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  UPDATE public.conversations
     SET status = 'open',
         is_read = false,
         assigned_to_id = coalesce(assigned_to_id, v_prev),
         updated_at = now()
   WHERE id = NEW.conversation_id
     AND status IN ('closed', 'resolved', 'pending');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reopen_conversation_on_customer_reply ON public.messages;
CREATE TRIGGER trg_reopen_conversation_on_customer_reply
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.reopen_conversation_on_customer_reply();