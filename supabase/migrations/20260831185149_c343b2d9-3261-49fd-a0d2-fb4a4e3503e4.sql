-- 1. Helper: detect automated/noise subjects
CREATE OR REPLACE FUNCTION public.is_noise_conversation(p_subject text, p_metadata jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT
    coalesce(p_metadata->>'is_spam', 'false') = 'true'
    OR coalesce(p_metadata->>'is_auto_reply', 'false') = 'true'
    OR coalesce(lower(btrim(p_subject)), '') ~ '^(auto[- ]?reply|automatic reply|autosvar|out of office|fraværsmelding|delivery status notification|undeliverable|mail delivery (failed|subsystem)|returned mail|read receipt|lesebekreftelse)'
$$;

-- 2. Core: find-or-create a case for a conversation
CREATE OR REPLACE FUNCTION public.link_conversation_to_case(p_conversation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conv public.conversations%ROWTYPE;
  v_case_id uuid;
  v_title text;
  v_channel text;
BEGIN
  SELECT * INTO v_conv FROM public.conversations WHERE id = p_conversation_id;
  IF NOT FOUND OR v_conv.case_id IS NOT NULL THEN
    RETURN v_conv.case_id;
  END IF;

  v_channel := v_conv.channel::text;

  -- Re-use an existing case for the same customer: still active, or closed within 7 days
  IF v_conv.customer_id IS NOT NULL THEN
    SELECT c.id INTO v_case_id
    FROM public.cases c
    WHERE c.organization_id = v_conv.organization_id
      AND c.customer_id = v_conv.customer_id
      AND (
        c.status IN ('open', 'in_progress', 'waiting_customer', 'waiting_internal')
        OR (c.status IN ('resolved', 'closed') AND coalesce(c.closed_at, c.resolved_at, c.updated_at) > now() - interval '7 days')
      )
    ORDER BY c.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_case_id IS NOT NULL THEN
    UPDATE public.cases
       SET status = CASE WHEN status IN ('resolved', 'closed') THEN 'open' ELSE status END,
           closed_at = CASE WHEN status IN ('resolved', 'closed') THEN NULL ELSE closed_at END,
           resolved_at = CASE WHEN status IN ('resolved', 'closed') THEN NULL ELSE resolved_at END,
           updated_at = now()
     WHERE id = v_case_id;
  ELSE
    v_title := NULLIF(btrim(coalesce(v_conv.subject, '')), '');
    IF v_title IS NULL THEN
      v_title := CASE WHEN v_channel = 'chat' THEN 'New chat conversation' ELSE 'New email conversation' END;
    END IF;

    INSERT INTO public.cases (organization_id, customer_id, title, status, priority, inbox_id, source_channel, metadata)
    VALUES (
      v_conv.organization_id,
      v_conv.customer_id,
      left(v_title, 300),
      'open',
      'normal',
      v_conv.inbox_id,
      v_channel,
      jsonb_build_object('auto_created', true, 'conversation_id', v_conv.id)
    )
    RETURNING id INTO v_case_id;
  END IF;

  UPDATE public.conversations SET case_id = v_case_id WHERE id = v_conv.id;
  RETURN v_case_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_conversation_to_case(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Insert trigger: email creates/links immediately, chat waits for a human
CREATE OR REPLACE FUNCTION public.auto_create_case_for_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.case_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.channel::text <> 'email' THEN
    RETURN NEW; -- chat handled by the human-involvement trigger
  END IF;
  IF public.is_noise_conversation(NEW.subject, NEW.metadata) THEN
    RETURN NEW;
  END IF;

  PERFORM public.link_conversation_to_case(NEW.id);
  RETURN NEW;
END;
$$;

-- 4. Update trigger: chat gets a case when an agent takes it; case closes with its conversations
CREATE OR REPLACE FUNCTION public.sync_case_on_conversation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_open_count int;
BEGIN
  -- Chat: create/link a case only once a human agent is involved
  IF NEW.case_id IS NULL
     AND NEW.channel::text = 'chat'
     AND NEW.assigned_to_id IS NOT NULL
     AND OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id
     AND NOT public.is_noise_conversation(NEW.subject, NEW.metadata) THEN
    PERFORM public.link_conversation_to_case(NEW.id);
    RETURN NEW;
  END IF;

  IF NEW.case_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'closed' THEN
      SELECT count(*) INTO v_open_count
      FROM public.conversations
      WHERE case_id = NEW.case_id AND id <> NEW.id AND status <> 'closed' AND deleted_at IS NULL;

      IF v_open_count = 0 THEN
        UPDATE public.cases
           SET status = 'closed',
               resolved_at = coalesce(resolved_at, now()),
               closed_at = coalesce(closed_at, now()),
               updated_at = now()
         WHERE id = NEW.case_id AND status NOT IN ('closed');
      END IF;
    ELSE
      UPDATE public.cases
         SET status = 'open', closed_at = NULL, resolved_at = NULL, updated_at = now()
       WHERE id = NEW.case_id AND status IN ('resolved', 'closed');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversations_sync_case ON public.conversations;
CREATE TRIGGER conversations_sync_case
AFTER UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.sync_case_on_conversation_update();