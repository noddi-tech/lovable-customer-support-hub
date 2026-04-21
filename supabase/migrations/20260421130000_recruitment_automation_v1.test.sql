-- ============================================================================
-- Automation rules — manual test cases (REFERENCE ONLY)
-- Updated for Phase 1.5 async architecture (2026-04-21)
-- ============================================================================
-- This file is NOT applied by migrations. Run cases manually, one at a time,
-- via the Supabase SQL Editor or `npx supabase db query --linked`.
--
-- Architecture reminder:
--   - Dry-run: execute_automation_rules dispatches synchronously and writes
--     the execution row in a single call. Expect overall_status='dry_run'
--     in the returned row.
--   - Real run: execute_automation_rules writes a 'pending' execution row
--     + a 'pending' queue row, returns immediately. The AFTER INSERT trigger
--     on the queue fires the process-automation-queue edge function. The
--     worker claims the row, dispatches, and flips execution+queue rows to
--     their final state. Poll the execution row to see the final outcome.
--
-- Placeholder IDs captured on 2026-04-21 (Noddi org). Update if seed changes.
-- All cases impersonate the Noddi super_admin:
--   SET LOCAL request.jwt.claims = '{"sub":"7e8f424e-5a2c-48ae-932c-39d5639b2d99"}';
--   admin profile_id: 55194f13-a056-4e86-99f7-c954c39d37b9
-- ============================================================================

-- Real Noddi IDs at time of writing:
--   NODDI_ORG          = b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b
--   NODDI_PIPELINE     = b32604e8-9385-4749-becb-04ba70761506   (Default)
--   NODDI_TEMPLATE     = f600217f-df7a-4751-a208-0a321a693f2d   (active template)
--   NODDI_APPLICATION  = b8c04b4a-6405-4c3a-936a-d3dbf924bbe0   (in pipeline)
--   ADMIN_USER_ID      = 7e8f424e-5a2c-48ae-932c-39d5639b2d99
--   ADMIN_PROFILE_ID   = 55194f13-a056-4e86-99f7-c954c39d37b9


-- ============================================================================
-- CASE 1 — Create a real send_email rule for stage_entered='qualified'
-- ============================================================================
-- Expected: one row in recruitment_automation_rules. Audit trigger writes
-- an INSERT row to recruitment_settings_audit.

SET LOCAL request.jwt.claims = '{"sub":"7e8f424e-5a2c-48ae-932c-39d5639b2d99"}';

INSERT INTO public.recruitment_automation_rules (
  organization_id, name, description,
  trigger_type, trigger_config,
  action_type, action_config,
  is_active, execution_order, created_by
) VALUES (
  'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b',
  'TEST: send email on qualified',
  'Phase 1.5 async smoke test — delete me after verifying',
  'stage_entered',
  jsonb_build_object('stage_id', 'qualified'),
  'send_email',
  jsonb_build_object('template_id', 'f600217f-df7a-4751-a208-0a321a693f2d'),
  true, 0, '55194f13-a056-4e86-99f7-c954c39d37b9'
)
RETURNING id, name;


-- ============================================================================
-- CASE 2 — Phase A: fire the rule (async path)
-- ============================================================================
-- Expected:
--   - Returns 1 row with overall_status='pending', action_results=NULL,
--     duration_ms=NULL, and an execution_id
--   - A pending execution row exists in recruitment_automation_executions
--   - A pending queue row exists in recruitment_automation_queue referencing
--     the execution_id
--   - The trg_automation_queue_kickoff trigger fires a net.http_post to
--     process-automation-queue; that worker is running in the background

SET LOCAL request.jwt.claims = '{"sub":"7e8f424e-5a2c-48ae-932c-39d5639b2d99"}';

SELECT *
FROM public.execute_automation_rules(
  p_trigger_type    := 'stage_entered',
  p_trigger_context := jsonb_build_object(
    'application_id', 'b8c04b4a-6405-4c3a-936a-d3dbf924bbe0',
    'applicant_id',   (SELECT applicant_id FROM applications WHERE id = 'b8c04b4a-6405-4c3a-936a-d3dbf924bbe0'),
    'from_stage_id',  'not_reviewed',
    'to_stage_id',    'qualified'
  ),
  p_dry_run         := false
);
-- Note the execution_id returned above; call it TEST_EXECUTION_ID.


-- ============================================================================
-- CASE 2 — Phase B: poll for completion (run 3-10s after Phase A)
-- ============================================================================
-- Expected: overall_status flipped to 'success' (SendGrid 2xx), action_results
-- populated with {success:true, http_status:200, response_excerpt:"...",
-- duration_ms:N}. is_dry_run=false. The queue row (join below) should show
-- status='done' with completed_at populated. The rule's execution_count
-- should have bumped from 0 to 1 and last_executed_at should be fresh.

SELECT
  e.overall_status,
  e.action_results->>'success'     AS success,
  e.action_results->>'http_status' AS http_status,
  LEFT(e.action_results->>'response_excerpt', 200) AS excerpt_200,
  e.duration_ms,
  q.status        AS queue_status,
  q.completed_at  AS queue_completed_at,
  q.error_text
FROM public.recruitment_automation_executions e
LEFT JOIN public.recruitment_automation_queue q ON q.execution_id = e.id
WHERE e.rule_name = 'TEST: send email on qualified'
  AND e.organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b'
ORDER BY e.created_at DESC
LIMIT 1;

-- If overall_status is still 'pending', wait a few more seconds and re-run.
-- If it's been >10s and still pending, check the worker logs via the
-- Supabase dashboard Functions view:
--   https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/functions/process-automation-queue/logs


-- ============================================================================
-- CASE 3 — Verify rule.last_executed_at + execution_count updated
-- ============================================================================
-- Expected (after Case 2 Phase B shows 'success'): last_executed_at within
-- the last minute, execution_count incremented.

SELECT name, last_executed_at, execution_count
FROM public.recruitment_automation_rules
WHERE name = 'TEST: send email on qualified'
  AND organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b';


-- ============================================================================
-- CASE 4 — Dry-run (sync path, unchanged from Phase 1)
-- ============================================================================
-- Expected:
--   - Returns 1 row with overall_status='dry_run'
--   - action_results.preview contains "Would send ..." with rendered subject
--   - action_results.success=true (preview succeeded)
--   - An execution row is written with is_dry_run=true, overall_status='dry_run'
--   - NO queue row is created (dry-run stays sync)
--   - Rule stats are NOT bumped

SET LOCAL request.jwt.claims = '{"sub":"7e8f424e-5a2c-48ae-932c-39d5639b2d99"}';

SELECT *
FROM public.execute_automation_rules(
  p_trigger_type    := 'stage_entered',
  p_trigger_context := jsonb_build_object(
    'application_id', 'b8c04b4a-6405-4c3a-936a-d3dbf924bbe0',
    'applicant_id',   (SELECT applicant_id FROM applications WHERE id = 'b8c04b4a-6405-4c3a-936a-d3dbf924bbe0'),
    'from_stage_id',  'not_reviewed',
    'to_stage_id',    'qualified'
  ),
  p_dry_run         := true
);

-- Sanity: confirm no queue row was created for this dry-run execution.
-- (Look up the most recent dry_run execution and check for a queue row.)
SELECT
  e.overall_status,
  e.is_dry_run,
  (SELECT count(*) FROM recruitment_automation_queue q WHERE q.execution_id = e.id) AS queue_row_count
FROM public.recruitment_automation_executions e
WHERE e.rule_name = 'TEST: send email on qualified'
  AND e.organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b'
  AND e.is_dry_run = true
ORDER BY e.created_at DESC
LIMIT 1;


-- ============================================================================
-- CASE 5 — Parked action (send_sms) — Phase A: fire
-- ============================================================================
-- Creates a rule with action_type='send_sms' (parked) and fires it async.
-- Expected Phase A:
--   - Rule insert succeeds (CHECK allows send_sms)
--   - execute_automation_rules returns overall_status='pending'
--   - Queue row gets inserted with status='pending'
--   - Worker picks it up and dispatch_action raises 'send_sms not implemented'
--   - The raised exception is caught by process_automation_queue_row and
--     surfaces as overall_status='failed' on the execution row with
--     action_results.error starting with "dispatch_action raised: Action
--     send_sms is not implemented in v1..."

SET LOCAL request.jwt.claims = '{"sub":"7e8f424e-5a2c-48ae-932c-39d5639b2d99"}';

WITH new_rule AS (
  INSERT INTO public.recruitment_automation_rules (
    organization_id, name, description,
    trigger_type, trigger_config,
    action_type, action_config,
    is_active, execution_order, created_by
  ) VALUES (
    'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b',
    'TEST: parked send_sms rule',
    'Verifies that parked actions surface cleanly as failed executions (async path)',
    'stage_entered',
    jsonb_build_object('stage_id', 'disqualified'),
    'send_sms',
    jsonb_build_object('message', 'Takk for din interesse.'),
    true, 99, '55194f13-a056-4e86-99f7-c954c39d37b9'
  )
  RETURNING id
)
SELECT *
FROM public.execute_automation_rules(
  p_trigger_type    := 'stage_entered',
  p_trigger_context := jsonb_build_object(
    'application_id', 'b8c04b4a-6405-4c3a-936a-d3dbf924bbe0',
    'applicant_id',   (SELECT applicant_id FROM applications WHERE id = 'b8c04b4a-6405-4c3a-936a-d3dbf924bbe0'),
    'from_stage_id',  'qualified',
    'to_stage_id',    'disqualified'
  ),
  p_dry_run         := false
);


-- ============================================================================
-- CASE 5 — Phase B: poll for the failure
-- ============================================================================
-- Run 3s after Phase A. Expected:
--   - overall_status='failed'
--   - action_results.success=false
--   - action_results.error contains 'not implemented in v1'
--   - Queue row status='failed', error_text populated

SELECT
  e.overall_status,
  e.action_results->>'success' AS success,
  LEFT(e.action_results->>'error', 200) AS error_200,
  q.status       AS queue_status,
  LEFT(q.error_text, 200) AS queue_error_200
FROM public.recruitment_automation_executions e
LEFT JOIN public.recruitment_automation_queue q ON q.execution_id = e.id
WHERE e.rule_name = 'TEST: parked send_sms rule'
  AND e.organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b'
  AND e.is_dry_run = false
ORDER BY e.created_at DESC
LIMIT 1;


-- ============================================================================
-- CASE 6 — Stuck-row reaper smoke test (optional)
-- ============================================================================
-- Artificially mark a queue row as stuck, then call reap_stuck_queue_rows().
-- Expected: reaper returns 1, the row flips back to 'pending', error_text
-- has a "[reaped at ...]" annotation appended.

-- Pick a recent done/failed queue row to flip (don't touch a real pending one!)
-- DO $$
-- DECLARE v_id uuid;
-- BEGIN
--   SELECT id INTO v_id FROM recruitment_automation_queue
--   WHERE status IN ('done','failed') ORDER BY created_at DESC LIMIT 1;
--
--   UPDATE recruitment_automation_queue
--   SET status='processing', picked_up_at = now() - interval '3 minutes', completed_at = NULL
--   WHERE id = v_id;
--
--   RAISE NOTICE 'Flipped queue_id=% to fake-stuck; calling reaper', v_id;
--   PERFORM reap_stuck_queue_rows();
-- END $$;
--
-- Then verify the row came back to 'pending' with a reap note:
-- SELECT id, status, error_text FROM recruitment_automation_queue
-- WHERE status='pending' AND error_text LIKE '%reaped at%'
-- ORDER BY created_at DESC LIMIT 1;


-- ============================================================================
-- CASE 7 — acknowledge_execution RPC smoke test
-- ============================================================================
-- Requires: at least one unacknowledged failed execution in your org
-- (Case 5 Phase B leaves one behind).
-- Expected:
--   - First call: returns the updated row, acknowledged_at is set to now(),
--     acknowledged_by = admin profile id
--   - Second call on the same row: RAISES 'Execution ... already acknowledged ...'

SET LOCAL request.jwt.claims = '{"sub":"7e8f424e-5a2c-48ae-932c-39d5639b2d99"}';

-- First call (should succeed)
SELECT id, overall_status, acknowledged_at, acknowledged_by
FROM public.acknowledge_execution(
  (SELECT id FROM recruitment_automation_executions
   WHERE organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b'
     AND overall_status = 'failed'
     AND acknowledged_at IS NULL
   ORDER BY created_at DESC LIMIT 1)
);

-- Second call on the same row (should raise)
-- SELECT * FROM public.acknowledge_execution('<the-same-id-as-above>');


-- ============================================================================
-- CLEANUP — remove the two test rules
-- ============================================================================
-- recruitment_automation_executions rows STAY (rule_id -> NULL via FK SET NULL;
-- rule_name snapshot preserved for audit history). Queue rows also stay via
-- ON DELETE SET NULL on rule_id. To also scrub executions + queue rows from
-- the TEST runs, see the optional cleanup below.

DELETE FROM public.recruitment_automation_rules
WHERE organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b'
  AND name IN ('TEST: send email on qualified', 'TEST: parked send_sms rule');

-- Optional deeper cleanup (uncomment if you want test executions gone):
-- DELETE FROM public.recruitment_automation_executions
-- WHERE organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b'
--   AND rule_name IN ('TEST: send email on qualified', 'TEST: parked send_sms rule');
-- -- Queue rows cascade via FK ON DELETE CASCADE from executions.
