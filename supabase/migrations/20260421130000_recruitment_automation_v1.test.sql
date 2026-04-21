-- ============================================================================
-- Phase 1 automation rules — manual test cases (REFERENCE ONLY)
-- ============================================================================
-- This file is NOT applied by migrations. Run cases manually, one at a time:
--   npx supabase db query --linked < <(sed -n 'START,ENDp' <this file>)
-- or copy-paste each block into the Supabase SQL Editor.
--
-- Placeholder IDs below are real Noddi-org IDs captured on 2026-04-21.
-- If they change, update the :set variables at the top.
--
-- All cases assume you're impersonating a Noddi admin in the session:
--   SET LOCAL request.jwt.claims = '{"sub":"7e8f424e-5a2c-48ae-932c-39d5639b2d99"}';
-- (profile_id 55194f13-a056-4e86-99f7-c954c39d37b9 in Noddi org)
--
-- After running a case, inspect the row returned by execute_automation_rules,
-- then query recruitment_automation_executions + recruitment_automation_rules
-- to verify the expected side effects.
-- ============================================================================

-- Real Noddi IDs at time of writing (adjust if seed data changes):
--   NODDI_ORG        = b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b
--   NODDI_PIPELINE   = b32604e8-9385-4749-becb-04ba70761506   (Default)
--   NODDI_TEMPLATE   = f600217f-df7a-4751-a208-0a321a693f2d   (any active template)
--   NODDI_APPLICATION = b8c04b4a-6405-4c3a-936a-d3dbf924bbe0   (currently in pipeline)
--   ADMIN_USER_ID    = 7e8f424e-5a2c-48ae-932c-39d5639b2d99
--   ADMIN_PROFILE_ID = 55194f13-a056-4e86-99f7-c954c39d37b9


-- ============================================================================
-- CASE 1 — Create a real send_email rule for 'stage_entered' on 'qualified'
-- ============================================================================
-- Expected: one row inserted into recruitment_automation_rules.
-- The audit trigger fires and writes an INSERT row to
-- recruitment_settings_audit.

SET LOCAL request.jwt.claims = '{"sub":"7e8f424e-5a2c-48ae-932c-39d5639b2d99"}';

INSERT INTO public.recruitment_automation_rules (
  organization_id, name, description,
  trigger_type, trigger_config,
  action_type, action_config,
  is_active, execution_order, created_by
) VALUES (
  'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b',
  'TEST: send email on qualified',
  'Phase 1 smoke test — delete me after verifying',
  'stage_entered',
  jsonb_build_object('stage_id', 'qualified'),
  'send_email',
  jsonb_build_object('template_id', 'f600217f-df7a-4751-a208-0a321a693f2d'),
  true, 0, '55194f13-a056-4e86-99f7-c954c39d37b9'
)
RETURNING id, name;
-- Save the returned rule id; we will refer to it as TEST_RULE_ID below.


-- ============================================================================
-- CASE 2 — Execute the rule for real (live send)
-- ============================================================================
-- Expected:
--   - Returns 1 row: {rule_id, rule_name, overall_status, action_results, duration_ms}
--   - overall_status = 'success' (assuming send-email returns 2xx)
--   - action_results.http_status = 200
--   - action_results.success = true
--   - A stage_change-style execution row written to
--     recruitment_automation_executions (overall_status='success',
--     is_dry_run=false, triggered_by=ADMIN_PROFILE_ID)
--   - The target rule's last_executed_at + execution_count are bumped

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


-- ============================================================================
-- CASE 3 — Verify the execution row was written with correct shape
-- ============================================================================
-- Expected: one recent row with overall_status='success', action_results.success=true,
-- is_dry_run=false, triggered_by set to the admin's profile id.

SELECT
  rule_name,
  overall_status,
  is_dry_run,
  triggered_by,
  action_results->>'success'          AS success,
  action_results->>'http_status'      AS http_status,
  LEFT(action_results->>'response_excerpt', 200) AS excerpt_200,
  duration_ms,
  created_at
FROM public.recruitment_automation_executions
WHERE organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b'
ORDER BY created_at DESC
LIMIT 1;


-- ============================================================================
-- CASE 4 — Verify rule.last_executed_at and execution_count were updated
-- ============================================================================
-- Expected: last_executed_at is within the last minute, execution_count = 1
-- (or whatever prior value + 1 if the rule has run before).

SELECT name, last_executed_at, execution_count
FROM public.recruitment_automation_rules
WHERE name = 'TEST: send email on qualified'
  AND organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b';


-- ============================================================================
-- CASE 5 — Dry-run the same rule
-- ============================================================================
-- Expected:
--   - Returns 1 row with overall_status='dry_run'
--   - action_results.preview = 'Would send "..." to <email>'
--   - action_results.success = true
--   - A new execution row with is_dry_run=true, overall_status='dry_run'
--   - The rule's last_executed_at + execution_count are NOT bumped
--     (i.e. no change vs. what Case 4 showed)

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

-- Then re-run CASE 4's SELECT on recruitment_automation_rules: the
-- execution_count should be unchanged from the post-CASE-2 value.


-- ============================================================================
-- CASE 6 — Parked action surfaces as a failed execution
-- ============================================================================
-- Creates a rule with action_type='send_sms' (parked in v1). Expected:
--   - Rule insert succeeds (CHECK allows send_sms)
--   - execute_automation_rules returns one row with
--     overall_status='failed'
--   - action_results.error contains 'dispatch_action raised: Action
--     send_sms is not implemented in v1...'
--   - An execution row is still written (is_dry_run=false,
--     overall_status='failed'), and the rule's execution_count does
--     bump (we count attempted executions whether or not they succeeded)

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
    'Verifies that parked actions surface cleanly as failed executions',
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
-- CLEANUP — remove the two test rules
-- ============================================================================
-- Execution rows survive on purpose (rule_id goes to NULL via FK SET NULL;
-- rule_name snapshot is preserved for audit history).

DELETE FROM public.recruitment_automation_rules
WHERE organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b'
  AND name IN ('TEST: send email on qualified', 'TEST: parked send_sms rule');
