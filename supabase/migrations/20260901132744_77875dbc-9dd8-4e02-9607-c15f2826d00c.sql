CREATE OR REPLACE FUNCTION public.apply_inbox_auto_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_brand text;
  v_rules jsonb;
BEGIN
  IF NEW.inbox_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT i.auto_assignment_rules INTO v_rules
  FROM public.inboxes i
  WHERE i.id = NEW.inbox_id;

  IF v_rules IS NULL THEN
    RETURN NEW;
  END IF;

  -- Default brand: only when the incoming conversation has none yet
  v_brand := NULLIF(v_rules->>'default_brand', '');
  IF v_brand IS NOT NULL
     AND COALESCE(NULLIF(NEW.metadata->>'brand', ''), NULLIF(NEW.metadata->>'brand_name', '')) IS NULL
  THEN
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb)
      || jsonb_build_object('brand', v_brand, 'brand_source', 'inbox_default');
  END IF;

  -- Auto-assignment: only when the conversation arrives unassigned
  IF NEW.assigned_to_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_profile_id := NULLIF(v_rules->>'assign_to_profile_id', '')::uuid;
  IF v_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_profile_id
      AND (NEW.organization_id IS NULL OR p.organization_id = NEW.organization_id)
  ) THEN
    NEW.assigned_to_id := v_profile_id;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.apply_inbox_auto_assignment() FROM PUBLIC, anon, authenticated;