-- Phase 1.5: async automation queue.
--
-- Motivation: SendGrid round-trips through pg_net take 2-10s and
-- block the user's kanban drag for the full duration. We move real
-- rule dispatch to an async queue + edge-function worker. Dry-run
-- stays synchronous (no queue involvement) because it returns the
-- preview immediately and doesn't do external IO.
--
-- Architecture:
--   1. execute_automation_rules writes an execution row in 'pending'
--      and a queue row in 'pending', then returns immediately.
--   2. AFTER INSERT trigger on the queue fires net.http_post (async)
--      to process-automation-queue edge function with the queue_id.
--   3. Worker calls process_automation_queue_row, which atomically
--      claims the row (UPDATE ... WHERE status='pending' RETURNING
--      is equivalent to SELECT FOR UPDATE SKIP LOCKED for this
--      single-row claim), dispatches via dispatch_action, and
--      flips both the queue and execution rows to their final state.
--   4. Stuck rows (processing > 2 min) get reaped back to 'pending'
--      by reap_stuck_queue_rows(), called at worker start.
--
-- Rule snapshot: queue row carries a jsonb copy of the rule so that
-- deleting/editing the rule mid-flight doesn't break dispatch.

-- ============================================================================
-- A. Schema additions
-- ============================================================================

CREATE TABLE public.recruitment_automation_queue (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id     uuid NOT NULL REFERENCES public.recruitment_automation_executions(id) ON DELETE CASCADE,
  rule_id          uuid REFERENCES public.recruitment_automation_rules(id) ON DELETE SET NULL,
  rule_snapshot    jsonb NOT NULL,
  trigger_context  jsonb NOT NULL,
  actor_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  picked_up_at     timestamptz,
  completed_at     timestamptz,
  error_text       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_queue_pending
  ON public.recruitment_automation_queue (status, created_at)
  WHERE status = 'pending';

CREATE INDEX idx_queue_processing
  ON public.recruitment_automation_queue (status, picked_up_at)
  WHERE status = 'processing';

CREATE INDEX idx_queue_execution
  ON public.recruitment_automation_queue (execution_id);

ALTER TABLE public.recruitment_automation_queue ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS. Explicit deny-all for any other role
-- is belt-and-suspenders: only the worker / plpgsql (SECURITY DEFINER)
-- should ever touch this table.
CREATE POLICY "service_role_only_queue"
  ON public.recruitment_automation_queue
  FOR ALL
  USING (false);

-- overall_status CHECK gains 'pending'
ALTER TABLE public.recruitment_automation_executions
  DROP CONSTRAINT IF EXISTS recruitment_automation_executions_overall_status_check;
ALTER TABLE public.recruitment_automation_executions
  ADD CONSTRAINT recruitment_automation_executions_overall_status_check
  CHECK (overall_status IN ('pending', 'success', 'failed', 'skipped', 'dry_run'));

-- Acknowledge-failure columns
ALTER TABLE public.recruitment_automation_executions
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.recruitment_automation_executions.acknowledged_at IS
  'When a human admin dismissed/acknowledged a failed execution. NULL means unacknowledged. Set only via acknowledge_execution RPC.';
COMMENT ON COLUMN public.recruitment_automation_executions.acknowledged_by IS
  'profile.id of the admin who acknowledged this execution. NULL if unacknowledged.';

-- ============================================================================
-- B. Refactor execute_automation_rules: dry-run stays sync, real-run enqueues
--
-- Return shape gains a 6th column (execution_id). Callers relying on
-- the previous 5-column shape will need to update. DROP + CREATE is
-- required — CREATE OR REPLACE cannot change OUT parameters.
-- ============================================================================

DROP FUNCTION IF EXISTS public.execute_automation_rules(text, jsonb, boolean);

CREATE FUNCTION public.execute_automation_rules(
  p_trigger_type    text,
  p_trigger_context jsonb,
  p_dry_run         boolean DEFAULT false
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
  v_user_id       uuid := auth.uid();
  v_profile_id    uuid;
  v_org_id        uuid;
  v_rule          record;
  v_execution_id  uuid;
  v_start_time    timestamptz;
  v_duration_ms   integer;
  v_action_result jsonb;
  v_status        text;
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
      AND public.rule_matches_context(trigger_type, trigger_config, p_trigger_context)
    ORDER BY execution_order ASC, created_at ASC
  LOOP
    v_start_time := clock_timestamp();

    IF p_dry_run THEN
      -- DRY-RUN: sync. Calls dispatch_action, writes execution row with dry_run.
      BEGIN
        v_action_result := public.dispatch_action(
          v_rule.action_type,
          v_rule.action_config,
          p_trigger_context,
          v_profile_id,
          true
        );
      EXCEPTION WHEN OTHERS THEN
        v_action_result := jsonb_build_object(
          'success',     false,
          'error',       'dispatch_action raised: ' || SQLERRM,
          'duration_ms', 0
        );
      END;

      v_duration_ms := (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::integer;
      v_status := 'dry_run';

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

      -- No rule-stat bump on dry runs
      rule_id        := v_rule.id;
      rule_name      := v_rule.name;
      overall_status := v_status;
      action_results := v_action_result;
      duration_ms    := v_duration_ms;
      execution_id   := v_execution_id;
      RETURN NEXT;
    ELSE
      -- REAL RUN: write pending execution + queue row, return immediately.
      -- The AFTER INSERT trigger on the queue fires the worker async.
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

GRANT EXECUTE ON FUNCTION public.execute_automation_rules(text, jsonb, boolean) TO authenticated;

COMMENT ON FUNCTION public.execute_automation_rules(text, jsonb, boolean) IS
  'Entry point for automation rule execution. Dry-run: synchronous dispatch, returns results in-band. Real run: enqueues work, returns pending rows immediately; an AFTER INSERT trigger on the queue fires the process-automation-queue edge function which completes dispatch asynchronously. Returns one row per matched rule with execution_id for follow-up polling.';

-- ============================================================================
-- C. Worker-kickoff trigger on queue INSERT
-- Fire-and-forget net.http_post to the worker edge function. We don't wait
-- for response; the worker updates the execution row on completion.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_automation_worker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_service_key text;
  -- TODO: move edge function URL to vault/config post-v1
  v_worker_url constant text :=
    'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/process-automation-queue';
BEGIN
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF v_service_key IS NULL THEN
    RAISE WARNING 'service_role_key missing from vault; worker not invoked for queue row %', NEW.id;
    RETURN NEW;
  END IF;

  -- Fire-and-forget: we discard the net request id. The worker will
  -- pick up the row by its queue_id via process_automation_queue_row.
  PERFORM net.http_post(
    url     := v_worker_url,
    body    := jsonb_build_object('queue_id', NEW.id),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_automation_worker() IS
  'AFTER INSERT trigger on recruitment_automation_queue. Fires async net.http_post to the process-automation-queue edge function with {queue_id}. Fire-and-forget; errors are absorbed with a RAISE WARNING. Worker picks up the claim via process_automation_queue_row.';

DROP TRIGGER IF EXISTS trg_automation_queue_kickoff ON public.recruitment_automation_queue;
CREATE TRIGGER trg_automation_queue_kickoff
  AFTER INSERT ON public.recruitment_automation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_automation_worker();

-- ============================================================================
-- D. Stuck-row recovery
-- Called at worker start to reclaim rows that got stuck in 'processing'
-- (worker crashed / timed out before it could flip to done/failed).
-- 2 minute threshold — dispatches should finish in <10s in practice.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reap_stuck_queue_rows()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reaped_count integer;
BEGIN
  WITH reaped AS (
    UPDATE public.recruitment_automation_queue
    SET status      = 'pending',
        picked_up_at = NULL,
        error_text   = COALESCE(error_text, '') ||
                       format('[reaped at %s after being stuck in processing since %s] ',
                              now()::text, picked_up_at::text)
    WHERE status = 'processing'
      AND picked_up_at < now() - interval '2 minutes'
    RETURNING id
  )
  SELECT count(*) INTO v_reaped_count FROM reaped;

  IF v_reaped_count > 0 THEN
    RAISE NOTICE 'Reaped % stuck queue rows', v_reaped_count;
  END IF;

  RETURN v_reaped_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reap_stuck_queue_rows() TO service_role;

COMMENT ON FUNCTION public.reap_stuck_queue_rows() IS
  'Reclaims queue rows stuck in processing for > 2 minutes back to pending. Called at the start of each worker invocation as a self-heal. Appends a reap note to error_text for audit.';

-- ============================================================================
-- E. Worker-called RPC: process_automation_queue_row
-- Atomic single-row claim via UPDATE ... WHERE status='pending' RETURNING.
-- Equivalent to SELECT FOR UPDATE SKIP LOCKED for this shape — two concurrent
-- workers racing on the same queue_id: one UPDATE succeeds, the other finds
-- no row and returns claimed=false.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_automation_queue_row(
  p_queue_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_row     record;
  v_action_type   text;
  v_action_config jsonb;
  v_start_time    timestamptz;
  v_duration_ms   integer;
  v_action_result jsonb;
  v_status        text;
BEGIN
  -- Atomic claim
  UPDATE public.recruitment_automation_queue
  SET status       = 'processing',
      picked_up_at = now()
  WHERE id = p_queue_id
    AND status = 'pending'
  RETURNING * INTO v_queue_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'reason',  'queue row not found or already claimed'
    );
  END IF;

  v_action_type   := v_queue_row.rule_snapshot->>'action_type';
  v_action_config := v_queue_row.rule_snapshot->'action_config';
  v_start_time    := clock_timestamp();

  -- Dispatch (worker only handles real runs — p_dry_run := false)
  BEGIN
    v_action_result := public.dispatch_action(
      v_action_type,
      v_action_config,
      v_queue_row.trigger_context,
      v_queue_row.actor_profile_id,
      false
    );
  EXCEPTION WHEN OTHERS THEN
    v_action_result := jsonb_build_object(
      'success',     false,
      'error',       'dispatch_action raised: ' || SQLERRM,
      'duration_ms', 0
    );
  END;

  v_duration_ms := (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::integer;
  v_status := CASE
    WHEN (v_action_result->>'success')::boolean IS TRUE THEN 'success'
    ELSE 'failed'
  END;

  -- Flip execution row from pending -> final
  UPDATE public.recruitment_automation_executions
  SET overall_status = v_status,
      action_results = v_action_result,
      duration_ms    = v_duration_ms
  WHERE id = v_queue_row.execution_id;

  -- Bump rule stats only on successful dispatch
  IF v_status = 'success' AND v_queue_row.rule_id IS NOT NULL THEN
    UPDATE public.recruitment_automation_rules
    SET last_executed_at = now(),
        execution_count  = execution_count + 1
    WHERE id = v_queue_row.rule_id;
  END IF;

  -- Mark queue row done/failed
  UPDATE public.recruitment_automation_queue
  SET status       = CASE WHEN v_status = 'success' THEN 'done' ELSE 'failed' END,
      completed_at = now(),
      error_text   = CASE WHEN v_status = 'failed'
                          THEN v_action_result->>'error'
                          ELSE NULL END
  WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'claimed',      true,
    'status',       v_status,
    'duration_ms',  v_duration_ms,
    'execution_id', v_queue_row.execution_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_automation_queue_row(uuid) TO service_role;

COMMENT ON FUNCTION public.process_automation_queue_row(uuid) IS
  'Claims a single queue row (atomic UPDATE ... WHERE status=pending RETURNING), dispatches the action via dispatch_action, flips the execution row to success/failed, bumps rule stats on success, marks the queue row done/failed. Returns {claimed: bool, status, duration_ms, execution_id}. Service role only; invoked by the process-automation-queue edge function.';
