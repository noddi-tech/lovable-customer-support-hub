CREATE OR REPLACE FUNCTION public.apply_inbox_auto_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  IF NEW.assigned_to_id IS NOT NULL OR NEW.inbox_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(i.auto_assignment_rules->>'assign_to_profile_id', '')::uuid
    INTO v_profile_id
  FROM public.inboxes i
  WHERE i.id = NEW.inbox_id;

  IF v_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only assign to a profile that still belongs to the same organization
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_profile_id
      AND (NEW.organization_id IS NULL OR p.organization_id = NEW.organization_id)
  ) THEN
    NEW.assigned_to_id := v_profile_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_inbox_auto_assignment ON public.conversations;
CREATE TRIGGER trg_apply_inbox_auto_assignment
BEFORE INSERT ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.apply_inbox_auto_assignment();