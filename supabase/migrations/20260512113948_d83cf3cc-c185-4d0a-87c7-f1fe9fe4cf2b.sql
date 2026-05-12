
-- =========================================================================
-- Phase 11A + 11B — Auto-scoring + stage data requirements
-- =========================================================================

-- ---------- 1. Extend applications ----------
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS score_explanation TEXT,
  ADD COLUMN IF NOT EXISTS score_strengths TEXT[],
  ADD COLUMN IF NOT EXISTS score_concerns TEXT[],
  ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS score_stage_id TEXT,
  ADD COLUMN IF NOT EXISTS score_model TEXT,
  ADD COLUMN IF NOT EXISTS score_status TEXT NOT NULL DEFAULT 'not_scored'
    CHECK (score_status IN ('not_scored','scoring','scored','failed','disabled')),
  ADD COLUMN IF NOT EXISTS stage_blocked_by_missing_fields BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stage_block_overridden_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stage_block_overridden_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage_block_override_reason TEXT;

-- relax existing score check to 0..10 if needed (existing column is INTEGER NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_score_range_chk'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_score_range_chk CHECK (score IS NULL OR (score >= 0 AND score <= 10));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS applications_score_not_null_idx ON public.applications(score) WHERE score IS NOT NULL;
CREATE INDEX IF NOT EXISTS applications_score_status_idx ON public.applications(score_status);
CREATE INDEX IF NOT EXISTS applications_position_score_idx ON public.applications(position_id, score DESC) WHERE score IS NOT NULL;

-- ---------- 2. Extend job_positions ----------
ALTER TABLE public.job_positions
  ADD COLUMN IF NOT EXISTS scoring_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scoring_rubric JSONB,
  ADD COLUMN IF NOT EXISTS scoring_global_baseline_id UUID;

-- ---------- 3. Extend applicant_files ----------
ALTER TABLE public.applicant_files
  ADD COLUMN IF NOT EXISTS extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending','done','failed','skipped')),
  ADD COLUMN IF NOT EXISTS extraction_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extraction_error TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS applicant_files_extraction_pending_idx
  ON public.applicant_files(extraction_status, created_at)
  WHERE extraction_status = 'pending';

DROP TRIGGER IF EXISTS applicant_files_set_updated_at ON public.applicant_files;
CREATE TRIGGER applicant_files_set_updated_at
  BEFORE UPDATE ON public.applicant_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 4. org_scoring_baselines ----------
CREATE TABLE IF NOT EXISTS public.org_scoring_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rubric JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  soft_deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS org_scoring_baselines_one_default_per_org
  ON public.org_scoring_baselines(organization_id)
  WHERE is_default = true AND soft_deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS org_scoring_baselines_org_idx ON public.org_scoring_baselines(organization_id) WHERE soft_deleted_at IS NULL;

DROP TRIGGER IF EXISTS org_scoring_baselines_set_updated_at ON public.org_scoring_baselines;
CREATE TRIGGER org_scoring_baselines_set_updated_at
  BEFORE UPDATE ON public.org_scoring_baselines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Now add the FK from job_positions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_positions_scoring_baseline_fk'
  ) THEN
    ALTER TABLE public.job_positions
      ADD CONSTRAINT job_positions_scoring_baseline_fk
      FOREIGN KEY (scoring_global_baseline_id)
      REFERENCES public.org_scoring_baselines(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.org_scoring_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view scoring baselines" ON public.org_scoring_baselines;
CREATE POLICY "Org members can view scoring baselines"
  ON public.org_scoring_baselines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = org_scoring_baselines.organization_id
      AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can insert scoring baselines" ON public.org_scoring_baselines;
CREATE POLICY "Admins can insert scoring baselines"
  ON public.org_scoring_baselines FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins can update scoring baselines" ON public.org_scoring_baselines;
CREATE POLICY "Admins can update scoring baselines"
  ON public.org_scoring_baselines FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins can delete scoring baselines" ON public.org_scoring_baselines;
CREATE POLICY "Admins can delete scoring baselines"
  ON public.org_scoring_baselines FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- ---------- 5. applicant_score_history (immutable) ----------
CREATE TABLE IF NOT EXISTS public.applicant_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  explanation TEXT,
  strengths TEXT[],
  concerns TEXT[],
  per_criterion JSONB,
  stage_id TEXT,
  model TEXT NOT NULL,
  trigger_reason TEXT NOT NULL CHECK (trigger_reason IN ('initial','stage_change','manual','data_change','re_run')),
  triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  input_snapshot JSONB,
  token_usage JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS applicant_score_history_app_idx ON public.applicant_score_history(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS applicant_score_history_org_idx ON public.applicant_score_history(organization_id, created_at DESC);

ALTER TABLE public.applicant_score_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view score history" ON public.applicant_score_history;
CREATE POLICY "Org members can view score history"
  ON public.applicant_score_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = applicant_score_history.organization_id
      AND m.user_id = auth.uid()
  ));

-- No INSERT/UPDATE/DELETE policies → only service role can write (immutable from app).

-- ---------- 6. pipeline_stage_field_requirements ----------
CREATE TABLE IF NOT EXISTS public.pipeline_stage_field_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.recruitment_pipelines(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  custom_field_id UUID NOT NULL REFERENCES public.recruitment_custom_fields(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.job_positions(id) ON DELETE CASCADE,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('required','optional')),
  block_stage_progression BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pipeline_stage_field_req_unique_org
  ON public.pipeline_stage_field_requirements(pipeline_id, stage_id, custom_field_id)
  WHERE position_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pipeline_stage_field_req_unique_pos
  ON public.pipeline_stage_field_requirements(pipeline_id, stage_id, custom_field_id, position_id)
  WHERE position_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pipeline_stage_field_req_lookup_idx
  ON public.pipeline_stage_field_requirements(pipeline_id, stage_id, position_id, display_order);

CREATE INDEX IF NOT EXISTS pipeline_stage_field_req_field_idx
  ON public.pipeline_stage_field_requirements(custom_field_id);

DROP TRIGGER IF EXISTS pipeline_stage_field_req_set_updated_at ON public.pipeline_stage_field_requirements;
CREATE TRIGGER pipeline_stage_field_req_set_updated_at
  BEFORE UPDATE ON public.pipeline_stage_field_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger: stage_id must exist in the referenced pipeline's stages JSONB
CREATE OR REPLACE FUNCTION public.validate_stage_field_req_stage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.recruitment_pipelines p,
                  jsonb_array_elements(p.stages) s
    WHERE p.id = NEW.pipeline_id
      AND s->>'id' = NEW.stage_id
  ) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'stage_id % not found in pipeline %', NEW.stage_id, NEW.pipeline_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pipeline_stage_field_req_validate_stage ON public.pipeline_stage_field_requirements;
CREATE TRIGGER pipeline_stage_field_req_validate_stage
  BEFORE INSERT OR UPDATE ON public.pipeline_stage_field_requirements
  FOR EACH ROW EXECUTE FUNCTION public.validate_stage_field_req_stage();

ALTER TABLE public.pipeline_stage_field_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view stage field requirements" ON public.pipeline_stage_field_requirements;
CREATE POLICY "Org members can view stage field requirements"
  ON public.pipeline_stage_field_requirements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = pipeline_stage_field_requirements.organization_id
      AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can manage stage field requirements" ON public.pipeline_stage_field_requirements;
CREATE POLICY "Admins can manage stage field requirements"
  ON public.pipeline_stage_field_requirements FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- ---------- 7. application_scoring_queue ----------
CREATE TABLE IF NOT EXISTS public.application_scoring_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trigger_reason TEXT NOT NULL CHECK (trigger_reason IN ('initial','stage_change','manual','data_change','re_run')),
  triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  triggered_at_stage_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS application_scoring_queue_pickup_idx
  ON public.application_scoring_queue(status, next_attempt_at NULLS FIRST, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS application_scoring_queue_app_idx ON public.application_scoring_queue(application_id);

CREATE INDEX IF NOT EXISTS application_scoring_queue_pending_per_app
  ON public.application_scoring_queue(application_id)
  WHERE status IN ('pending','processing');

DROP TRIGGER IF EXISTS application_scoring_queue_set_updated_at ON public.application_scoring_queue;
CREATE TRIGGER application_scoring_queue_set_updated_at
  BEFORE UPDATE ON public.application_scoring_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.application_scoring_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view scoring queue" ON public.application_scoring_queue;
CREATE POLICY "Org members can view scoring queue"
  ON public.application_scoring_queue FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = application_scoring_queue.organization_id
      AND m.user_id = auth.uid()
  ));

-- No INSERT/UPDATE/DELETE policies → only service role can write.

-- ---------- 8. Trigger: enqueue scoring on stage change ----------
CREATE OR REPLACE FUNCTION public.enqueue_scoring_on_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_scoring_enabled BOOLEAN;
  v_already_pending BOOLEAN;
BEGIN
  IF NEW.current_stage_id IS NOT DISTINCT FROM OLD.current_stage_id THEN
    RETURN NEW;
  END IF;

  SELECT scoring_enabled INTO v_scoring_enabled
  FROM public.job_positions WHERE id = NEW.position_id;

  IF NOT COALESCE(v_scoring_enabled, false) THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.application_scoring_queue
    WHERE application_id = NEW.id AND status IN ('pending','processing')
  ) INTO v_already_pending;

  IF v_already_pending THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.application_scoring_queue
    (application_id, organization_id, trigger_reason, triggered_at_stage_id)
  VALUES (NEW.id, NEW.organization_id, 'stage_change', NEW.current_stage_id);

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS applications_enqueue_scoring_on_stage_change ON public.applications;
CREATE TRIGGER applications_enqueue_scoring_on_stage_change
  AFTER UPDATE OF current_stage_id ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_scoring_on_stage_change();

-- ---------- 9. Trigger: enqueue scoring on custom field value change ----------
CREATE OR REPLACE FUNCTION public.enqueue_scoring_on_field_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_app RECORD;
  v_already_pending BOOLEAN;
  v_field_relevant BOOLEAN;
BEGIN
  -- Find the active application(s) for this applicant; v1: latest application
  FOR v_app IN
    SELECT a.id, a.organization_id, a.position_id, a.current_stage_id, jp.pipeline_id, jp.scoring_enabled
    FROM public.applications a
    JOIN public.job_positions jp ON jp.id = a.position_id
    WHERE a.applicant_id = NEW.applicant_id
  LOOP
    IF NOT COALESCE(v_app.scoring_enabled, false) THEN
      CONTINUE;
    END IF;

    -- Check if this field is referenced by any requirement at the current stage
    SELECT EXISTS (
      SELECT 1 FROM public.pipeline_stage_field_requirements r
      WHERE r.pipeline_id = v_app.pipeline_id
        AND r.stage_id = v_app.current_stage_id
        AND r.custom_field_id = NEW.field_id
        AND (r.position_id IS NULL OR r.position_id = v_app.position_id)
    ) INTO v_field_relevant;

    IF NOT v_field_relevant THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.application_scoring_queue
      WHERE application_id = v_app.id AND status IN ('pending','processing')
    ) INTO v_already_pending;

    IF v_already_pending THEN
      CONTINUE;
    END IF;

    INSERT INTO public.application_scoring_queue
      (application_id, organization_id, trigger_reason, triggered_at_stage_id)
    VALUES (v_app.id, v_app.organization_id, 'data_change', v_app.current_stage_id);
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS field_values_enqueue_scoring ON public.recruitment_applicant_field_values;
CREATE TRIGGER field_values_enqueue_scoring
  AFTER INSERT OR UPDATE ON public.recruitment_applicant_field_values
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_scoring_on_field_change();

-- ---------- 10. Trigger: applicant_files extraction status default already 'pending' ----------
-- Mark image files as 'skipped' immediately so cron doesn't try to extract them.
CREATE OR REPLACE FUNCTION public.mark_non_text_files_skipped()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.file_name ~* '\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|tiff)$' THEN
    NEW.extraction_status := 'skipped';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS applicant_files_mark_non_text_skipped ON public.applicant_files;
CREATE TRIGGER applicant_files_mark_non_text_skipped
  BEFORE INSERT ON public.applicant_files
  FOR EACH ROW EXECUTE FUNCTION public.mark_non_text_files_skipped();

-- Backfill: set images already in table to 'skipped'
UPDATE public.applicant_files
SET extraction_status = 'skipped'
WHERE extraction_status = 'pending'
  AND file_name ~* '\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|tiff)$';
