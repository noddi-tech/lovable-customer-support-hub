-- Extend move_application_stage RPC:
-- - Replace p_notify (boolean) with p_notify_preference (text: email|sms|both|skip)
-- - Return SETOF applications so PostgREST clients receive the updated row
-- - Keep p_note passthrough to application_events.notes
-- - Rename event_data key 'notify' -> 'notify_preference' to match param name
--
-- Audit (2026-04-21): only one existing writer of event_data.notify in the
-- codebase (the client hook we are about to replace in Task 4). No readers.
-- Safe to rename without backward-compatibility shim.

DROP FUNCTION IF EXISTS public.move_application_stage(uuid, text, boolean, text);

CREATE OR REPLACE FUNCTION public.move_application_stage(
  p_application_id     uuid,
  p_to_stage_id        text,
  p_notify_preference  text DEFAULT 'skip',
  p_note               text DEFAULT NULL
)
RETURNS SETOF public.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id         uuid;
  v_profile_id      uuid;
  v_from_stage_id   text;
  v_applicant_id    uuid;
  v_org_id          uuid;
  v_position_id     uuid;
  v_pipeline_id     uuid;
  v_stages          jsonb;
BEGIN
  -- (0) Validate notify_preference value
  IF p_notify_preference NOT IN ('email', 'sms', 'both', 'skip') THEN
    RAISE EXCEPTION 'Invalid notify_preference: %. Must be one of: email, sms, both, skip', p_notify_preference;
  END IF;

  -- (1) Caller identity — capture up front, before any role-switching side effects
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- (2) Resolve profiles.id — FK target for application_events.performed_by
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile missing for user %', v_user_id;
  END IF;

  -- (3) Lock the application row and capture current state
  SELECT a.current_stage_id, a.applicant_id, a.organization_id, a.position_id
    INTO v_from_stage_id, v_applicant_id, v_org_id, v_position_id
  FROM public.applications a
  WHERE a.id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- (4) Authorize: any active org member
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_memberships om
    WHERE om.user_id = v_user_id
      AND om.organization_id = v_org_id
      AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- (5) Target stage must exist in the position's pipeline
  SELECT jp.pipeline_id INTO v_pipeline_id
  FROM public.job_positions jp
  WHERE jp.id = v_position_id;

  IF v_pipeline_id IS NULL THEN
    RAISE EXCEPTION 'Position has no pipeline; cannot validate target stage';
  END IF;

  SELECT p.stages INTO v_stages
  FROM public.recruitment_pipelines p
  WHERE p.id = v_pipeline_id;

  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_stages) s
    WHERE s->>'id' = p_to_stage_id
  ) THEN
    RAISE EXCEPTION 'Target stage % does not exist in pipeline', p_to_stage_id;
  END IF;

  -- (6) No-op guard: return the current row, write no event
  IF v_from_stage_id = p_to_stage_id THEN
    RETURN QUERY
      SELECT * FROM public.applications WHERE id = p_application_id;
    RETURN;
  END IF;

  -- (7) Audit event (uses captured v_from_stage_id from before the UPDATE)
  INSERT INTO public.application_events (
    application_id, applicant_id, organization_id,
    event_type, event_data, performed_by, notes
  )
  VALUES (
    p_application_id,
    v_applicant_id,
    v_org_id,
    'stage_change',
    jsonb_build_object(
      'from',               v_from_stage_id,
      'to',                 p_to_stage_id,
      'notify_preference',  p_notify_preference
    ),
    v_profile_id,
    p_note
  );

  -- (8) Stage transition — emit the updated row to the caller
  RETURN QUERY
    UPDATE public.applications
    SET current_stage_id = p_to_stage_id
    WHERE id = p_application_id
    RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_application_stage(uuid, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.move_application_stage(uuid, text, text, text) IS
  'Atomically moves a single application to a new stage and writes a matching stage_change event with the caller''s notify_preference (email|sms|both|skip). Returns the updated application row (or the unchanged row on no-op). performed_by resolves auth.uid() -> profiles.id. Authorized for any active organization_memberships member. Uses SELECT FOR UPDATE to serialize concurrent moves.';
