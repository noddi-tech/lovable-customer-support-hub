-- Bug 1 hotfix: applications.score_status CHECK constraint disallows 'pending'.
-- Replace 'pending' writes with 'scoring' (matches existing manual scoring path
-- and the value useApplicationScore polling already handles).

CREATE OR REPLACE FUNCTION public.enqueue_scoring_on_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_force_off BOOLEAN;
  v_has_rubric BOOLEAN;
  v_already_pending BOOLEAN;
BEGIN
  IF NEW.current_stage_id IS NOT DISTINCT FROM OLD.current_stage_id THEN
    RETURN NEW;
  END IF;

  SELECT scoring_enabled INTO v_force_off
  FROM public.job_positions WHERE id = NEW.position_id;
  IF v_force_off IS FALSE THEN
    RETURN NEW;
  END IF;

  SELECT public.position_has_resolvable_rubric(NEW.position_id) INTO v_has_rubric;
  IF NOT v_has_rubric THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.application_scoring_queue
    WHERE application_id = NEW.id AND status IN ('pending','processing')
  ) INTO v_already_pending;

  IF v_already_pending THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.application_scoring_queue
    (application_id, organization_id, trigger_reason, stage_id_at_trigger)
  VALUES (NEW.id, NEW.organization_id, 'stage_change', NEW.current_stage_id);

  UPDATE public.applications
  SET score_status = 'scoring'
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_scoring_on_field_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_has_rubric BOOLEAN;
  v_already_pending BOOLEAN;
BEGIN
  FOR v_app IN
    SELECT a.id, a.organization_id, a.position_id, a.current_stage_id, jp.scoring_enabled
    FROM public.applications a
    JOIN public.job_positions jp ON jp.id = a.position_id
    WHERE a.applicant_id = NEW.applicant_id
  LOOP
    IF v_app.scoring_enabled IS FALSE THEN
      CONTINUE;
    END IF;

    SELECT public.position_has_resolvable_rubric(v_app.position_id) INTO v_has_rubric;
    IF NOT v_has_rubric THEN
      CONTINUE;
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM public.application_scoring_queue
      WHERE application_id = v_app.id AND status IN ('pending','processing')
    ) INTO v_already_pending;

    IF v_already_pending THEN
      CONTINUE;
    END IF;

    INSERT INTO public.application_scoring_queue
      (application_id, organization_id, trigger_reason, stage_id_at_trigger)
    VALUES (v_app.id, v_app.organization_id, 'data_change', v_app.current_stage_id);

    UPDATE public.applications
    SET score_status = 'scoring'
    WHERE id = v_app.id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_scoring_on_applicant_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_has_rubric BOOLEAN;
  v_already_pending BOOLEAN;
BEGIN
  FOR v_app IN
    SELECT a.id, a.organization_id, a.position_id, a.current_stage_id, jp.scoring_enabled
    FROM public.applications a
    JOIN public.job_positions jp ON jp.id = a.position_id
    WHERE a.applicant_id = NEW.id
  LOOP
    IF v_app.scoring_enabled IS FALSE THEN
      CONTINUE;
    END IF;

    SELECT public.position_has_resolvable_rubric(v_app.position_id) INTO v_has_rubric;
    IF NOT v_has_rubric THEN
      CONTINUE;
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM public.application_scoring_queue
      WHERE application_id = v_app.id AND status IN ('pending','processing')
    ) INTO v_already_pending;

    IF v_already_pending THEN
      CONTINUE;
    END IF;

    INSERT INTO public.application_scoring_queue
      (application_id, organization_id, trigger_reason, stage_id_at_trigger)
    VALUES (v_app.id, v_app.organization_id, 'data_change', v_app.current_stage_id);

    UPDATE public.applications
    SET score_status = 'scoring'
    WHERE id = v_app.id;
  END LOOP;

  RETURN NEW;
END;
$$;