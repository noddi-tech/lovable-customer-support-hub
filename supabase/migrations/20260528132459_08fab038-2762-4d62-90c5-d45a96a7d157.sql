
-- 1. Resolution helper: true when this position has a resolvable rubric.
CREATE OR REPLACE FUNCTION public.position_has_resolvable_rubric(p_position_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.job_positions jp
    LEFT JOIN public.org_scoring_baselines b_link
      ON b_link.id = jp.scoring_global_baseline_id
     AND b_link.soft_deleted_at IS NULL
    LEFT JOIN public.org_scoring_baselines b_default
      ON b_default.organization_id = jp.organization_id
     AND b_default.is_default = true
     AND b_default.soft_deleted_at IS NULL
    WHERE jp.id = p_position_id
      AND (
        jp.scoring_rubric IS NOT NULL
        OR b_link.id IS NOT NULL
        OR b_default.id IS NOT NULL
      )
  );
$$;

-- 2. Stage-change trigger function: drop scoring_enabled-only guard,
--    treat scoring_enabled as manual force-off, also require rubric resolution.
CREATE OR REPLACE FUNCTION public.enqueue_scoring_on_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_force_off       BOOLEAN;
  v_already_pending BOOLEAN;
BEGIN
  IF NEW.current_stage_id IS NOT DISTINCT FROM OLD.current_stage_id THEN
    RETURN NEW;
  END IF;

  SELECT scoring_enabled INTO v_force_off
  FROM public.job_positions WHERE id = NEW.position_id;

  -- Treat NULL as "not force-disabled". Only explicit FALSE blocks scoring.
  IF v_force_off IS FALSE THEN
    RETURN NEW;
  END IF;

  IF NOT public.position_has_resolvable_rubric(NEW.position_id) THEN
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
END $function$;

-- 3. Field-change trigger function: drop scoring_enabled-only guard and
--    drop the stage-relevance filter. Any custom field upsert can trigger
--    a re-score (still debounced by pending/processing queue rows).
CREATE OR REPLACE FUNCTION public.enqueue_scoring_on_field_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_app             RECORD;
  v_already_pending BOOLEAN;
BEGIN
  FOR v_app IN
    SELECT a.id, a.organization_id, a.position_id, a.current_stage_id, jp.scoring_enabled
    FROM public.applications a
    JOIN public.job_positions jp ON jp.id = a.position_id
    WHERE a.applicant_id = NEW.applicant_id
  LOOP
    -- Manual force-OFF override.
    IF v_app.scoring_enabled IS FALSE THEN
      CONTINUE;
    END IF;

    IF NOT public.position_has_resolvable_rubric(v_app.position_id) THEN
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
END $function$;

-- 4. Cold-start helper.
CREATE OR REPLACE FUNCTION public.enqueue_initial_scoring_for_position(p_position_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app          RECORD;
  v_force_off    BOOLEAN;
BEGIN
  SELECT scoring_enabled INTO v_force_off
  FROM public.job_positions WHERE id = p_position_id;
  IF v_force_off IS FALSE THEN RETURN; END IF;

  IF NOT public.position_has_resolvable_rubric(p_position_id) THEN
    RETURN;
  END IF;

  FOR v_app IN
    SELECT a.id, a.organization_id, a.current_stage_id
    FROM public.applications a
    WHERE a.position_id = p_position_id
      AND NOT EXISTS (
        SELECT 1 FROM public.application_scoring_queue q
        WHERE q.application_id = a.id AND q.status IN ('pending','processing')
      )
  LOOP
    INSERT INTO public.application_scoring_queue
      (application_id, organization_id, trigger_reason, triggered_at_stage_id)
    VALUES (v_app.id, v_app.organization_id, 'initial', v_app.current_stage_id);
  END LOOP;
END $$;

-- 5. Position-level cold-start trigger.
--    Fire when a rubric becomes resolvable: INSERT with a rubric/baseline,
--    or UPDATE that changes rubric / baseline link / force-off.
CREATE OR REPLACE FUNCTION public.trg_positions_cold_start_scoring()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_resolvable BOOLEAN := false;
  v_was_force_off  BOOLEAN := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Compute pre-update resolvability using OLD values.
    SELECT EXISTS (
      SELECT 1
      WHERE
        OLD.scoring_rubric IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM public.org_scoring_baselines b
          WHERE b.id = OLD.scoring_global_baseline_id
            AND b.soft_deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.org_scoring_baselines b
          WHERE b.organization_id = OLD.organization_id
            AND b.is_default = true
            AND b.soft_deleted_at IS NULL
        )
    ) INTO v_was_resolvable;
    v_was_force_off := (OLD.scoring_enabled IS FALSE);
  END IF;

  -- Only act when the position is now eligible AND wasn't before (or row is new).
  IF NEW.scoring_enabled IS FALSE THEN RETURN NEW; END IF;
  IF NOT public.position_has_resolvable_rubric(NEW.id) THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' OR (NOT v_was_resolvable) OR v_was_force_off THEN
    PERFORM public.enqueue_initial_scoring_for_position(NEW.id);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_positions_cold_start_scoring ON public.job_positions;
CREATE TRIGGER trg_positions_cold_start_scoring
AFTER INSERT OR UPDATE OF scoring_rubric, scoring_global_baseline_id, scoring_enabled
ON public.job_positions
FOR EACH ROW EXECUTE FUNCTION public.trg_positions_cold_start_scoring();

-- 6. Baseline default-flip cold-start trigger.
--    Fire when a baseline becomes the org default (INSERT with is_default=true,
--    or UPDATE that flips is_default false->true). Cold-start every position in
--    that org that has no own rubric and no explicit baseline link.
CREATE OR REPLACE FUNCTION public.trg_baseline_default_cold_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position RECORD;
  v_should_fire BOOLEAN := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_should_fire := COALESCE(NEW.is_default, false) AND NEW.soft_deleted_at IS NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Strictly: is_default went false -> true (no-op when unchanged or stays false).
    v_should_fire := COALESCE(NEW.is_default, false) = true
                 AND COALESCE(OLD.is_default, false) = false
                 AND NEW.soft_deleted_at IS NULL;
  END IF;

  IF NOT v_should_fire THEN RETURN NEW; END IF;

  FOR v_position IN
    SELECT jp.id
    FROM public.job_positions jp
    WHERE jp.organization_id = NEW.organization_id
      AND jp.scoring_rubric IS NULL
      AND jp.scoring_global_baseline_id IS NULL
      AND jp.scoring_enabled IS DISTINCT FROM false
  LOOP
    PERFORM public.enqueue_initial_scoring_for_position(v_position.id);
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_baseline_default_cold_start ON public.org_scoring_baselines;
CREATE TRIGGER trg_baseline_default_cold_start
AFTER INSERT OR UPDATE OF is_default
ON public.org_scoring_baselines
FOR EACH ROW EXECUTE FUNCTION public.trg_baseline_default_cold_start();

-- 7. Data fix: flip existing positions to scoring_enabled = true.
--    Column becomes a manual force-OFF override only; queue processor + the
--    resolvable-rubric check are the safety nets.
UPDATE public.job_positions
SET scoring_enabled = true
WHERE scoring_enabled IS DISTINCT FROM false;

ALTER TABLE public.job_positions ALTER COLUMN scoring_enabled SET DEFAULT true;
