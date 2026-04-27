
-- ============================================================
-- Phase 7: Recruitment Audit Module
-- ============================================================

-- 1. Retention config on organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS recruitment_audit_retention_days integer NOT NULL DEFAULT 1095
    CHECK (recruitment_audit_retention_days >= 30 AND recruitment_audit_retention_days <= 7300);

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS recruitment_audit_last_cleanup_at timestamptz;

-- 2. Audit events table
CREATE TABLE IF NOT EXISTS public.recruitment_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  event_type text NOT NULL,
  event_category text NOT NULL CHECK (event_category IN ('write','export','auth','system')),

  subject_table text NOT NULL,
  subject_id uuid,
  applicant_id uuid REFERENCES public.applicants(id) ON DELETE SET NULL,

  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text,

  old_values jsonb,
  new_values jsonb,

  context jsonb,
  ip_address inet,
  user_agent text,

  occurred_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_audit_events_org_occurred_at
  ON public.recruitment_audit_events(organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_applicant
  ON public.recruitment_audit_events(applicant_id)
  WHERE applicant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_events_actor
  ON public.recruitment_audit_events(actor_profile_id)
  WHERE actor_profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type
  ON public.recruitment_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_expires
  ON public.recruitment_audit_events(expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE public.recruitment_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins view audit events" ON public.recruitment_audit_events;
CREATE POLICY "Org admins view audit events"
  ON public.recruitment_audit_events FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

-- No INSERT/UPDATE/DELETE policies: append-only via SECURITY DEFINER functions and triggers.

-- 3. Trigger function
CREATE OR REPLACE FUNCTION public.recruitment_audit_capture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    v_applicant_id := v_subject_id;
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
$$;

-- 4. Attach triggers (all five target tables verified to exist in discovery)
DROP TRIGGER IF EXISTS trg_audit_applicants ON public.applicants;
CREATE TRIGGER trg_audit_applicants
  AFTER INSERT OR UPDATE OR DELETE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.recruitment_audit_capture();

DROP TRIGGER IF EXISTS trg_audit_applications ON public.applications;
CREATE TRIGGER trg_audit_applications
  AFTER INSERT OR UPDATE OR DELETE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.recruitment_audit_capture();

DROP TRIGGER IF EXISTS trg_audit_applicant_notes ON public.applicant_notes;
CREATE TRIGGER trg_audit_applicant_notes
  AFTER INSERT OR UPDATE OR DELETE ON public.applicant_notes
  FOR EACH ROW EXECUTE FUNCTION public.recruitment_audit_capture();

-- applicant_files has no updated_at: INSERT/DELETE only
DROP TRIGGER IF EXISTS trg_audit_applicant_files ON public.applicant_files;
CREATE TRIGGER trg_audit_applicant_files
  AFTER INSERT OR DELETE ON public.applicant_files
  FOR EACH ROW EXECUTE FUNCTION public.recruitment_audit_capture();

-- application_events is itself audit-shaped: INSERT only
DROP TRIGGER IF EXISTS trg_audit_application_events ON public.application_events;
CREATE TRIGGER trg_audit_application_events
  AFTER INSERT ON public.application_events
  FOR EACH ROW EXECUTE FUNCTION public.recruitment_audit_capture();

-- 5. Export-logging RPC
CREATE OR REPLACE FUNCTION public.log_audit_export(
  p_event_type text,
  p_applicant_id uuid,
  p_context jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_org_id uuid;
  v_retention_days integer;
  v_event_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT id, organization_id INTO v_profile_id, v_org_id
  FROM public.profiles WHERE user_id = v_user_id LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization for user';
  END IF;

  SELECT recruitment_audit_retention_days INTO v_retention_days
  FROM public.organizations WHERE id = v_org_id;

  IF v_retention_days IS NULL THEN
    v_retention_days := 1095;
  END IF;

  INSERT INTO public.recruitment_audit_events (
    organization_id, event_type, event_category,
    subject_table, subject_id, applicant_id,
    actor_profile_id, context,
    occurred_at, expires_at
  ) VALUES (
    v_org_id, p_event_type, 'export',
    'applicants', p_applicant_id, p_applicant_id,
    v_profile_id, p_context,
    now(), now() + (v_retention_days || ' days')::interval
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_export(text, uuid, jsonb) TO authenticated;

-- 6. Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_audit_events()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted bigint;
  v_affected_orgs uuid[];
BEGIN
  -- Capture affected orgs first
  SELECT array_agg(DISTINCT organization_id)
  INTO v_affected_orgs
  FROM public.recruitment_audit_events
  WHERE expires_at IS NOT NULL AND expires_at < now();

  DELETE FROM public.recruitment_audit_events
  WHERE expires_at IS NOT NULL AND expires_at < now();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Stamp last_cleanup on every org (so admins can see "ran today, 0 deleted")
  UPDATE public.organizations
  SET recruitment_audit_last_cleanup_at = now();

  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_audit_events() TO authenticated;

-- 7. Schedule daily cleanup via pg_cron (03:15 UTC)
DO $$
BEGIN
  PERFORM cron.unschedule('recruitment-audit-cleanup-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recruitment-audit-cleanup-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'recruitment-audit-cleanup-daily',
  '15 3 * * *',
  $$ SELECT public.cleanup_expired_audit_events(); $$
);
