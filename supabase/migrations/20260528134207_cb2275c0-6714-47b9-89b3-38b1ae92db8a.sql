-- 1. Update existing trigger functions to also flip score_status to 'pending'
CREATE OR REPLACE FUNCTION public.enqueue_scoring_on_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  UPDATE public.applications
  SET score_status = 'pending'
  WHERE id = NEW.id;

  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.enqueue_scoring_on_field_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

    UPDATE public.applications
    SET score_status = 'pending'
    WHERE id = v_app.id;
  END LOOP;

  RETURN NEW;
END $function$;

-- 2. New function: enqueue scoring when scoring-relevant applicant columns change
CREATE OR REPLACE FUNCTION public.enqueue_scoring_on_applicant_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_app             RECORD;
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

    UPDATE public.applications
    SET score_status = 'pending'
    WHERE id = v_app.id;
  END LOOP;

  RETURN NEW;
END $function$;

-- 3. Attach triggers (idempotent)
DROP TRIGGER IF EXISTS trg_applications_enqueue_scoring_on_stage_change ON public.applications;
CREATE TRIGGER trg_applications_enqueue_scoring_on_stage_change
  AFTER UPDATE OF current_stage_id ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_scoring_on_stage_change();

DROP TRIGGER IF EXISTS trg_field_values_enqueue_scoring ON public.recruitment_applicant_field_values;
CREATE TRIGGER trg_field_values_enqueue_scoring
  AFTER INSERT OR UPDATE ON public.recruitment_applicant_field_values
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_scoring_on_field_change();

-- Watch list MUST match scoring engine SELECT in process-scoring-queue exactly.
-- Engine reads: location, years_experience, certifications, drivers_license_classes,
-- language_norwegian, work_permit_status, availability_date. own_vehicle is NOT read.
DROP TRIGGER IF EXISTS trg_applicants_enqueue_scoring ON public.applicants;
CREATE TRIGGER trg_applicants_enqueue_scoring
  AFTER UPDATE OF
    location,
    years_experience,
    certifications,
    drivers_license_classes,
    language_norwegian,
    work_permit_status,
    availability_date
  ON public.applicants
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_scoring_on_applicant_change();