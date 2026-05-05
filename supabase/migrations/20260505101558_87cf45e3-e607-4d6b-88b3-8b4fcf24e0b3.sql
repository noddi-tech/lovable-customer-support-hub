
-- =========================================================================
-- 1. Stage SLA configuration: add sla_hours + sla_enabled to each stage
--    in the JSONB stages array, but only on default pipelines whose stage
--    names still match the seed defaults (not customized) and that don't
--    already have sla_hours.
-- =========================================================================

WITH candidates AS (
  SELECT id, stages
  FROM public.recruitment_pipelines
  WHERE is_default = true
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(stages) s
      WHERE s ? 'sla_hours'
    )
),
seeded AS (
  SELECT
    c.id,
    jsonb_agg(
      CASE
        WHEN (s->>'id') = 'not_reviewed' AND (s->>'name') = 'Ikke vurdert'
          THEN s || jsonb_build_object('sla_hours', 24, 'sla_enabled', true)
        WHEN (s->>'id') = 'qualified' AND (s->>'name') = 'Kvalifisert & i dialog'
          THEN s || jsonb_build_object('sla_hours', 72, 'sla_enabled', true)
        ELSE s || jsonb_build_object('sla_hours', NULL, 'sla_enabled', true)
      END
      ORDER BY (s->>'order')::int
    ) AS new_stages
  FROM candidates c, jsonb_array_elements(c.stages) s
  GROUP BY c.id
)
UPDATE public.recruitment_pipelines p
SET stages = seeded.new_stages,
    updated_at = now()
FROM seeded
WHERE p.id = seeded.id;

-- For non-default / customized pipelines, just ensure sla fields exist as null
UPDATE public.recruitment_pipelines p
SET stages = (
  SELECT jsonb_agg(
    CASE WHEN s ? 'sla_hours' THEN s
         ELSE s || jsonb_build_object('sla_hours', NULL, 'sla_enabled', true)
    END
    ORDER BY (s->>'order')::int
  )
  FROM jsonb_array_elements(p.stages) s
)
WHERE NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(p.stages) s WHERE s ? 'sla_hours'
);

-- =========================================================================
-- 2. applications: entered_stage_at + assigned_at + triggers
-- =========================================================================

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS entered_stage_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

-- Backfill entered_stage_at: latest application_stage_changed per application,
-- fallback to applied_at, fallback to created_at.
WITH latest_stage_event AS (
  SELECT
    subject_id AS application_id,
    occurred_at,
    ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY occurred_at DESC) AS rn
  FROM public.recruitment_audit_events
  WHERE event_type = 'application_stage_changed'
    AND subject_table = 'applications'
    AND subject_id IS NOT NULL
)
UPDATE public.applications a
SET entered_stage_at = COALESCE(
  (SELECT lse.occurred_at FROM latest_stage_event lse
    WHERE lse.application_id = a.id AND lse.rn = 1),
  a.applied_at,
  a.created_at
)
WHERE a.entered_stage_at IS NULL;

-- Backfill assigned_at: no dedicated assignment_changed event exists,
-- so use updated_at when assigned_to is set, else NULL.
UPDATE public.applications
SET assigned_at = updated_at
WHERE assigned_to IS NOT NULL AND assigned_at IS NULL;

-- Trigger function: maintain entered_stage_at and assigned_at
CREATE OR REPLACE FUNCTION public.recruitment_applications_track_stage_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.current_stage_id IS DISTINCT FROM OLD.current_stage_id THEN
    NEW.entered_stage_at := now();
  END IF;
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    NEW.assigned_at := CASE WHEN NEW.assigned_to IS NULL THEN NULL ELSE now() END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_applications_track_stage_assignment ON public.applications;
CREATE TRIGGER trg_applications_track_stage_assignment
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.recruitment_applications_track_stage_assignment();

-- Set entered_stage_at on INSERT
CREATE OR REPLACE FUNCTION public.recruitment_applications_set_initial_stage_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.entered_stage_at IS NULL THEN
    NEW.entered_stage_at := COALESCE(NEW.applied_at, now());
  END IF;
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_at IS NULL THEN
    NEW.assigned_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_applications_set_initial_stage_at ON public.applications;
CREATE TRIGGER trg_applications_set_initial_stage_at
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.recruitment_applications_set_initial_stage_at();

-- =========================================================================
-- 3. recruitment_followups
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.recruitment_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  note text,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  snoozed_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruitment_followups_inbox
  ON public.recruitment_followups (organization_id, completed_at, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_recruitment_followups_assignee
  ON public.recruitment_followups (assigned_to, completed_at, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_recruitment_followups_applicant
  ON public.recruitment_followups (applicant_id);

ALTER TABLE public.recruitment_followups ENABLE ROW LEVEL SECURITY;

-- Helper: org membership via profiles
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND is_active = true
      AND role IN ('admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE POLICY "followups_select_org_members"
  ON public.recruitment_followups FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "followups_insert_org_members"
  ON public.recruitment_followups FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = public.current_profile_id()
  );

CREATE POLICY "followups_update_owner_assignee_admin"
  ON public.recruitment_followups FOR UPDATE
  USING (
    public.is_org_member(organization_id) AND (
      public.is_org_admin(organization_id)
      OR created_by = public.current_profile_id()
      OR assigned_to = public.current_profile_id()
    )
  );

CREATE POLICY "followups_delete_owner_admin"
  ON public.recruitment_followups FOR DELETE
  USING (
    public.is_org_member(organization_id) AND (
      public.is_org_admin(organization_id)
      OR created_by = public.current_profile_id()
    )
  );

-- updated_at trigger
CREATE TRIGGER trg_recruitment_followups_updated_at
  BEFORE UPDATE ON public.recruitment_followups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_followups;
ALTER TABLE public.recruitment_followups REPLICA IDENTITY FULL;
