-- Move real-run dispatch out of Postgres. The Phase 1.5 async refactor
-- decoupled the client from the worker, but the worker was still calling
-- process_automation_queue_row which did net.http_post + synchronous
-- collect_response inside a single SQL statement. That hits the Postgres
-- statement timeout on SendGrid round-trips (typical: 2-10s).
--
-- New model:
--   claim_queue_row(queue_id)            - fast, Postgres only
--   [edge function does HTTP in Deno]
--   finalize_queue_row(queue_id, ...)    - fast, Postgres only
--
-- dispatch_action is demoted to DRY-RUN ONLY. Real dispatch logic
-- lives in TypeScript in the process-automation-queue edge function.

-- ============================================================================
-- A. claim_queue_row — atomic claim + everything the edge function needs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_queue_row(
  p_queue_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  -- Self-heal stuck rows at the start of every claim attempt
  PERFORM public.reap_stuck_queue_rows();

  UPDATE public.recruitment_automation_queue
  SET status       = 'processing',
      picked_up_at = now()
  WHERE id = p_queue_id
    AND status = 'pending'
  RETURNING id, execution_id, rule_id, rule_snapshot, trigger_context,
            actor_profile_id, organization_id
  INTO v_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'reason',  'queue row not found or already claimed'
    );
  END IF;

  RETURN jsonb_build_object(
    'claimed',          true,
    'queue_id',         v_row.id,
    'execution_id',     v_row.execution_id,
    'rule_id',          v_row.rule_id,
    'rule_snapshot',    v_row.rule_snapshot,
    'trigger_context',  v_row.trigger_context,
    'actor_profile_id', v_row.actor_profile_id,
    'organization_id',  v_row.organization_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_queue_row(uuid) TO service_role;

COMMENT ON FUNCTION public.claim_queue_row(uuid) IS
  'Atomically claims a queue row and returns everything the edge function needs to dispatch (rule snapshot, context, actor). Calls reap_stuck_queue_rows() first as a self-heal. No external HTTP — fast. Service role only. Paired with finalize_queue_row.';

-- ============================================================================
-- B. finalize_queue_row — write back after edge function finishes dispatch
-- ============================================================================
CREATE OR REPLACE FUNCTION public.finalize_queue_row(
  p_queue_id       uuid,
  p_execution_id   uuid,
  p_action_results jsonb,
  p_duration_ms    integer,
  p_final_status   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule_id uuid;
BEGIN
  IF p_final_status NOT IN ('success', 'failed') THEN
    RAISE EXCEPTION 'Invalid final_status: %. Must be success or failed.', p_final_status;
  END IF;

  SELECT rule_id INTO v_rule_id
  FROM public.recruitment_automation_queue
  WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue row % not found', p_queue_id;
  END IF;

  -- Flip execution row from pending -> final
  UPDATE public.recruitment_automation_executions
  SET overall_status = p_final_status,
      action_results = p_action_results,
      duration_ms    = p_duration_ms
  WHERE id = p_execution_id;

  -- Bump rule stats only on successful dispatch
  IF p_final_status = 'success' AND v_rule_id IS NOT NULL THEN
    UPDATE public.recruitment_automation_rules
    SET last_executed_at = now(),
        execution_count  = execution_count + 1
    WHERE id = v_rule_id;
  END IF;

  -- Mark queue row done/failed
  UPDATE public.recruitment_automation_queue
  SET status       = CASE WHEN p_final_status = 'success' THEN 'done' ELSE 'failed' END,
      completed_at = now(),
      error_text   = CASE WHEN p_final_status = 'failed'
                          THEN p_action_results->>'error'
                          ELSE NULL END
  WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'finalized',    true,
    'queue_id',     p_queue_id,
    'execution_id', p_execution_id,
    'final_status', p_final_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_queue_row(uuid, uuid, jsonb, integer, text) TO service_role;

COMMENT ON FUNCTION public.finalize_queue_row(uuid, uuid, jsonb, integer, text) IS
  'Called by the process-automation-queue edge function after its Deno-side dispatch completes. Updates execution row (overall_status, action_results, duration_ms), bumps rule stats on success, marks queue row done/failed. No external HTTP — fast. Service role only.';

-- ============================================================================
-- C. dispatch_action — demoted to DRY-RUN ONLY
-- Real dispatch is now TypeScript in the edge function. Calling this with
-- p_dry_run=false raises immediately to surface any regression.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dispatch_action(
  p_action_type       text,
  p_action_config     jsonb,
  p_trigger_context   jsonb,
  p_actor_profile_id  uuid,
  p_dry_run           boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time      timestamptz := clock_timestamp();
  v_application_id  uuid;
  v_applicant_email text;
  v_template        record;
BEGIN
  -- Real runs must go through process-automation-queue. This function only
  -- renders previews for dry-run mode now.
  IF NOT p_dry_run THEN
    RAISE EXCEPTION 'dispatch_action is dry-run only post-Phase 1.5. Real runs must go through process-automation-queue edge function.';
  END IF;

  v_application_id := (p_trigger_context->>'application_id')::uuid;

  CASE p_action_type

    WHEN 'send_email' THEN
      IF p_action_config->>'template_id' IS NULL THEN
        RETURN jsonb_build_object(
          'success',     false,
          'error',       'send_email requires template_id in action_config',
          'duration_ms', 0
        );
      END IF;

      SELECT a.email INTO v_applicant_email
      FROM public.applications app
      JOIN public.applicants a ON a.id = app.applicant_id
      WHERE app.id = v_application_id;

      SELECT id, subject INTO v_template
      FROM public.recruitment_email_templates
      WHERE id = (p_action_config->>'template_id')::uuid;

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'success',     false,
          'error',       'Template not found',
          'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
        );
      END IF;

      RETURN jsonb_build_object(
        'success',     true,
        'dry_run',     true,
        'preview',     'Would send "' || v_template.subject || '" to ' ||
                       COALESCE(v_applicant_email, '<no email>'),
        'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
      );

    WHEN 'assign_to' THEN
      RETURN jsonb_build_object(
        'success',     true,
        'dry_run',     true,
        'preview',     'Would assign application to user ' ||
                       COALESCE(p_action_config->>'user_id', '<null>'),
        'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
      );

    WHEN 'webhook' THEN
      RETURN jsonb_build_object(
        'success',     true,
        'dry_run',     true,
        'preview',     'Would POST to ' ||
                       COALESCE(p_action_config->>'url', '<null>'),
        'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
      );

    WHEN 'send_sms' THEN
      RAISE EXCEPTION 'Action send_sms is not implemented in v1. Configure a different action type.';

    WHEN 'create_task' THEN
      RAISE EXCEPTION 'Action create_task is not implemented in v1. Configure a different action type.';

    ELSE
      RAISE EXCEPTION 'Unknown action_type: %', p_action_type;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.dispatch_action(text, jsonb, jsonb, uuid, boolean) IS
  'DRY-RUN ONLY post-Phase 1.5. Returns preview strings for each action type without doing any external I/O. Raises if called with p_dry_run=false to surface any regression. Real dispatch lives in TypeScript in the process-automation-queue edge function.';

-- ============================================================================
-- D. Drop process_automation_queue_row (superseded by claim + finalize)
-- ============================================================================
DROP FUNCTION IF EXISTS public.process_automation_queue_row(uuid);
