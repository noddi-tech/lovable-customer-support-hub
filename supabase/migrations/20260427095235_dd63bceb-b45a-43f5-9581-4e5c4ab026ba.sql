-- Phase 4 — match-only RPC, external/internal classifier, skip_reason, and
-- skip_external + only_rule_ids support in execute_automation_rules.

-- ============================================================================
-- A. Skip reason column on executions
-- ============================================================================
ALTER TABLE public.recruitment_automation_executions
  ADD COLUMN IF NOT EXISTS skip_reason text;

COMMENT ON COLUMN public.recruitment_automation_executions.skip_reason IS
  'Optional free-text reason set when the agent chose to skip an external automation action (overall_status=skipped). NULL otherwise.';

-- ============================================================================
-- B. is_external_action_type — central classifier
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_external_action_type(p_action_type text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_action_type IN ('send_email', 'webhook', 'send_sms');
$$;

COMMENT ON FUNCTION public.is_external_action_type(text) IS
  'Classifies an automation action_type as external (visible to the applicant: send_email, webhook, send_sms) or internal (staff-only: assign_to, create_task). Used by the kanban move-confirm flow to decide whether to prompt before firing.';

-- ============================================================================
-- C. match_automation_rules — read-only rule preview
-- ============================================================================
CREATE OR REPLACE FUNCTION public.match_automation_rules(
  p_trigger_type    text,
  p_trigger_context jsonb
)
RETURNS TABLE (
  rule_id        uuid,
  rule_name      text,
  action_type    text,
  action_config  jsonb,
  is_external    boolean,
  execution_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_profile_id uuid;
  v_org_id     uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT id, organization_id INTO v_profile_id, v_org_id
  FROM public.profiles WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for user %', v_user_id;
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.action_type,
    r.action_config,
    public.is_external_action_type(r.action_type),
    r.execution_order
  FROM public.recruitment_automation_rules r
  WHERE r.organization_id = v_org_id
    AND r.trigger_type    = p_trigger_type
    AND r.is_active       = true
    AND public.rule_matches_context(r.trigger_type, r.trigger_config, p_trigger_context)
  ORDER BY r.execution_order ASC, r.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_automation_rules(text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.match_automation_rules(text, jsonb) IS
  'Read-only preview of which active automation rules would match the given trigger context, scoped to the caller''s organization. Returns rule metadata + is_external classification. Does NOT enqueue or execute. Used by the kanban drag-end handler to decide whether to show the confirmation modal.';

-- ============================================================================
-- D. execute_automation_rules — add skip_external, skip_reason, only_rule_ids
--
-- Drop + recreate (signature change). Same return shape as before.
-- ============================================================================
DROP FUNCTION IF EXISTS public.execute_automation_rules(text, jsonb, boolean);

CREATE FUNCTION public.execute_automation_rules(
  p_trigger_type    text,
  p_trigger_context jsonb,
  p_dry_run         boolean DEFAULT false,
  p_skip_external   boolean DEFAULT false,
  p_skip_reason     text    DEFAULT NULL,
  p_only_rule_ids   uuid[]  DEFAULT NULL
)
RETURNS TABLE (
  rule_id        uuid,
  rule_name      text,
  overall_status text,
  action_results jsonb,
  duration_ms    integer,
  execution_id   uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid := auth.uid();
  v_profile_id     uuid;
  v_org_id         uuid;
  v_rule           record;
  v_execution_id   uuid;
  v_start_time     timestamptz;
  v_duration_ms    integer;
  v_action_result  jsonb;
  v_status         text;
  v_is_external    boolean;
  v_skip_array     jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT id, organization_id INTO v_profile_id, v_org_id
  FROM public.profiles WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for user %', v_user_id;
  END IF;

  FOR v_rule IN
    SELECT *
    FROM public.recruitment_automation_rules
    WHERE organization_id = v_org_id
      AND trigger_type    = p_trigger_type
      AND is_active       = true
      AND (p_only_rule_ids IS NULL OR id = ANY(p_only_rule_ids))
      AND public.rule_matches_context(trigger_type, trigger_config, p_trigger_context)
    ORDER BY execution_order ASC, created_at ASC
  LOOP
    v_start_time  := clock_timestamp();
    v_is_external := public.is_external_action_type(v_rule.action_type);

    -- Skip-external short-circuit: write a 'skipped' execution row, no queue, no dispatch.
    IF p_skip_external AND v_is_external AND NOT p_dry_run THEN
      v_skip_array := jsonb_build_array(jsonb_build_object(
        'action_type', v_rule.action_type,
        'success',     null,
        'skipped',     true,
        'skip_reason', p_skip_reason
      ));

      INSERT INTO public.recruitment_automation_executions (
        organization_id, rule_id, rule_name,
        application_id, applicant_id,
        triggered_by, trigger_context,
        action_results, overall_status,
        is_dry_run, duration_ms, skip_reason
      ) VALUES (
        v_org_id, v_rule.id, v_rule.name,
        NULLIF(p_trigger_context->>'application_id', '')::uuid,
        NULLIF(p_trigger_context->>'applicant_id',   '')::uuid,
        v_profile_id, p_trigger_context,
        v_skip_array, 'skipped',
        false, 0, p_skip_reason
      )
      RETURNING id INTO v_execution_id;

      rule_id        := v_rule.id;
      rule_name      := v_rule.name;
      overall_status := 'skipped';
      action_results := v_skip_array;
      duration_ms    := 0;
      execution_id   := v_execution_id;
      RETURN NEXT;
      CONTINUE;
    END IF;

    IF p_dry_run THEN
      BEGIN
        v_action_result := public.dispatch_action(
          v_rule.action_type,
          v_rule.action_config,
          p_trigger_context,
          v_profile_id,
          true
        );
      EXCEPTION WHEN OTHERS THEN
        v_action_result := jsonb_build_array(jsonb_build_object(
          'action_type', v_rule.action_type,
          'success',     false,
          'error',       'dispatch_action raised: ' || SQLERRM,
          'duration_ms', 0
        ));
      END;

      v_duration_ms := (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::integer;
      v_status      := 'dry_run';

      INSERT INTO public.recruitment_automation_executions (
        organization_id, rule_id, rule_name,
        application_id, applicant_id,
        triggered_by, trigger_context,
        action_results, overall_status,
        is_dry_run, duration_ms
      ) VALUES (
        v_org_id, v_rule.id, v_rule.name,
        NULLIF(p_trigger_context->>'application_id', '')::uuid,
        NULLIF(p_trigger_context->>'applicant_id',   '')::uuid,
        v_profile_id, p_trigger_context,
        v_action_result, v_status,
        true, v_duration_ms
      )
      RETURNING id INTO v_execution_id;

      rule_id        := v_rule.id;
      rule_name      := v_rule.name;
      overall_status := v_status;
      action_results := v_action_result;
      duration_ms    := v_duration_ms;
      execution_id   := v_execution_id;
      RETURN NEXT;
    ELSE
      -- REAL RUN (internal action OR external when skip_external=false): enqueue.
      INSERT INTO public.recruitment_automation_executions (
        organization_id, rule_id, rule_name,
        application_id, applicant_id,
        triggered_by, trigger_context,
        action_results, overall_status,
        is_dry_run, duration_ms
      ) VALUES (
        v_org_id, v_rule.id, v_rule.name,
        NULLIF(p_trigger_context->>'application_id', '')::uuid,
        NULLIF(p_trigger_context->>'applicant_id',   '')::uuid,
        v_profile_id, p_trigger_context,
        NULL, 'pending',
        false, NULL
      )
      RETURNING id INTO v_execution_id;

      INSERT INTO public.recruitment_automation_queue (
        execution_id, rule_id, rule_snapshot, trigger_context,
        actor_profile_id, organization_id, status
      ) VALUES (
        v_execution_id, v_rule.id, to_jsonb(v_rule), p_trigger_context,
        v_profile_id, v_org_id, 'pending'
      );

      rule_id        := v_rule.id;
      rule_name      := v_rule.name;
      overall_status := 'pending';
      action_results := NULL;
      duration_ms    := NULL;
      execution_id   := v_execution_id;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_automation_rules(text, jsonb, boolean, boolean, text, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.execute_automation_rules(text, jsonb, boolean, boolean, text, uuid[]) IS
  'Entry point for automation rule execution. Dry-run: sync dispatch. Real run: enqueues work. New params: p_skip_external (writes overall_status=skipped rows for external actions, no queue insert), p_skip_reason (free text, persisted on skipped rows), p_only_rule_ids (restricts execution to a subset of matched rules).';
