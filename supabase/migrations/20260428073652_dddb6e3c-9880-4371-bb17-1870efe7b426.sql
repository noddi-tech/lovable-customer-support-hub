CREATE OR REPLACE FUNCTION public.recruitment_audit_capture()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_actor_profile_id uuid;
  v_subject_id uuid;
  v_applicant_id uuid;
  v_event_type text;
  v_old jsonb;
  v_new jsonb;
  v_retention_days integer;
  v_old_full jsonb;
  v_new_full jsonb;
BEGIN
  -- Resolve actor (NULL for service role / triggers fired without auth context)
  SELECT id INTO v_actor_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Resolve org + subject + applicant per source table
  IF TG_TABLE_NAME = 'applicants' THEN
    v_org_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.organization_id END), OLD.organization_id);
    v_subject_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.id END), OLD.id);
    -- HOTFIX: applicant row is gone by the time this AFTER DELETE trigger fires,
    -- so the FK on applicant_id would violate. Snapshot is preserved via
    -- subject_table+subject_id+old_values+event_type.
    v_applicant_id := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE v_subject_id END;
  ELSIF TG_TABLE_NAME = 'applications' THEN
    v_org_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.organization_id END), OLD.organization_id);
    v_subject_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.id END), OLD.id);
    v_applicant_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.applicant_id END), OLD.applicant_id);
  ELSIF TG_TABLE_NAME = 'applicant_notes' THEN
    v_org_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.organization_id END), OLD.organization_id);
    v_subject_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.id END), OLD.id);
    v_applicant_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.applicant_id END), OLD.applicant_id);
  ELSIF TG_TABLE_NAME = 'applicant_files' THEN
    v_org_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.organization_id END), OLD.organization_id);
    v_subject_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.id END), OLD.id);
    v_applicant_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.applicant_id END), OLD.applicant_id);
  ELSIF TG_TABLE_NAME = 'application_events' THEN
    v_org_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.organization_id END), OLD.organization_id);
    v_subject_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.id END), OLD.id);
    v_applicant_id := COALESCE((CASE WHEN TG_OP <> 'DELETE' THEN NEW.applicant_id END), OLD.applicant_id);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT recruitment_audit_retention_days INTO v_retention_days
  FROM public.organizations WHERE id = v_org_id;

  IF v_retention_days IS NULL THEN
    v_retention_days := 1095;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_event_type := TG_TABLE_NAME || '_created';
    v_old := NULL;
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := TG_TABLE_NAME || '_updated';
    v_old_full := to_jsonb(OLD);
    v_new_full := to_jsonb(NEW);

    SELECT jsonb_object_agg(key, value)
    INTO v_old
    FROM jsonb_each(v_old_full)
    WHERE key NOT IN ('updated_at')
      AND value IS DISTINCT FROM (v_new_full -> key);

    SELECT jsonb_object_agg(key, value)
    INTO v_new
    FROM jsonb_each(v_new_full)
    WHERE key NOT IN ('updated_at')
      AND value IS DISTINCT FROM (v_old_full -> key);

    -- Skip no-op updates
    IF v_old IS NULL AND v_new IS NULL THEN
      RETURN NEW;
    END IF;

    -- Special-case: stage change on applications
    IF TG_TABLE_NAME = 'applications' AND v_old ? 'current_stage_id' THEN
      v_event_type := 'application_stage_changed';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := TG_TABLE_NAME || '_deleted';
    v_old := to_jsonb(OLD);
    v_new := NULL;
  END IF;

  INSERT INTO public.recruitment_audit_events (
    organization_id, event_type, event_category,
    subject_table, subject_id, applicant_id,
    actor_profile_id, actor_role,
    old_values, new_values,
    occurred_at, expires_at
  ) VALUES (
    v_org_id, v_event_type, 'write',
    TG_TABLE_NAME, v_subject_id, v_applicant_id,
    v_actor_profile_id, NULL,
    v_old, v_new,
    now(), now() + (v_retention_days || ' days')::interval
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;