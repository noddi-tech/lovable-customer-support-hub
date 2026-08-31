CREATE OR REPLACE FUNCTION public.auto_create_case_for_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_title text;
  v_channel text;
BEGIN
  IF NEW.case_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_channel := NEW.channel::text;
  IF v_channel NOT IN ('email', 'chat') THEN
    RETURN NEW;
  END IF;

  v_title := NULLIF(btrim(coalesce(NEW.subject, '')), '');
  IF v_title IS NULL THEN
    v_title := CASE WHEN v_channel = 'chat' THEN 'New chat conversation' ELSE 'New email conversation' END;
  END IF;

  INSERT INTO public.cases (organization_id, customer_id, title, status, priority, inbox_id, source_channel, metadata)
  VALUES (
    NEW.organization_id,
    NEW.customer_id,
    left(v_title, 300),
    'open',
    'normal',
    NEW.inbox_id,
    v_channel,
    jsonb_build_object('auto_created', true, 'conversation_id', NEW.id)
  )
  RETURNING id INTO v_case_id;

  UPDATE public.conversations SET case_id = v_case_id WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversations_auto_create_case ON public.conversations;
CREATE TRIGGER conversations_auto_create_case
  AFTER INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_case_for_conversation();

-- Backfill: open/pending conversations without a case
DO $$
DECLARE
  r RECORD;
  v_case_id uuid;
  v_title text;
BEGIN
  FOR r IN
    SELECT id, organization_id, customer_id, subject, inbox_id, channel::text AS channel
    FROM public.conversations
    WHERE case_id IS NULL
      AND channel::text IN ('email', 'chat')
      AND status::text NOT IN ('closed', 'resolved')
  LOOP
    v_title := NULLIF(btrim(coalesce(r.subject, '')), '');
    IF v_title IS NULL THEN
      v_title := CASE WHEN r.channel = 'chat' THEN 'New chat conversation' ELSE 'New email conversation' END;
    END IF;

    INSERT INTO public.cases (organization_id, customer_id, title, status, priority, inbox_id, source_channel, metadata)
    VALUES (r.organization_id, r.customer_id, left(v_title, 300), 'open', 'normal', r.inbox_id, r.channel,
            jsonb_build_object('auto_created', true, 'backfilled', true, 'conversation_id', r.id))
    RETURNING id INTO v_case_id;

    UPDATE public.conversations SET case_id = v_case_id WHERE id = r.id;
  END LOOP;
END;
$$;