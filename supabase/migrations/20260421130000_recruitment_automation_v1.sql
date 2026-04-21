-- Recruitment automation v1: schema tweaks + RPC + helpers.
--
-- Architecture A1: the RPC and its helpers run under SECURITY DEFINER
-- and invoke our own edge functions (send-email, dispatch-webhook) via
-- pg_net's net.http_post, authenticated with a service_role_key stored
-- in supabase_vault. The one-time vault insert is assumed done:
--   SELECT vault.create_secret('<key>', 'service_role_key', '...');
--
-- Action scope:
--   send_email  — implemented (template rendered server-side, SendGrid via edge)
--   assign_to   — implemented (pure UPDATE)
--   webhook     — implemented (via our dispatch-webhook edge function)
--   send_sms    — parked, RAISE EXCEPTION
--   create_task — parked, RAISE EXCEPTION
--
-- Trigger values follow v1 naming:
--   stage_entered, application_created, position_published, inactivity_timeout
-- (renamed from the old stage_change / applicant_created; zero rows to migrate.)

-- Edge function URLs (TODO: move to vault/config post-v1)
-- send-email:      https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/send-email
-- dispatch-webhook: https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/dispatch-webhook

-- ============================================================================
-- Part A — schema changes on existing tables
-- ============================================================================

-- recruitment_automation_rules: add rule stats + rename trigger values
ALTER TABLE public.recruitment_automation_rules
  ADD COLUMN IF NOT EXISTS last_executed_at timestamptz,
  ADD COLUMN IF NOT EXISTS execution_count  integer NOT NULL DEFAULT 0;

-- Rename trigger_type values before swapping the CHECK (zero rows today)
UPDATE public.recruitment_automation_rules
  SET trigger_type = 'stage_entered'
  WHERE trigger_type = 'stage_change';

UPDATE public.recruitment_automation_rules
  SET trigger_type = 'application_created'
  WHERE trigger_type = 'applicant_created';

ALTER TABLE public.recruitment_automation_rules
  DROP CONSTRAINT IF EXISTS recruitment_automation_rules_trigger_type_check;
ALTER TABLE public.recruitment_automation_rules
  ADD CONSTRAINT recruitment_automation_rules_trigger_type_check
  CHECK (trigger_type IN (
    'stage_entered',
    'application_created',
    'position_published',
    'inactivity_timeout'
  ));

-- recruitment_automation_executions: add triggered_by + is_dry_run; rename/widen status
ALTER TABLE public.recruitment_automation_executions
  ADD COLUMN IF NOT EXISTS triggered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_dry_run   boolean NOT NULL DEFAULT false;

ALTER TABLE public.recruitment_automation_executions
  RENAME COLUMN action_result TO overall_status;
ALTER TABLE public.recruitment_automation_executions
  RENAME COLUMN action_detail TO action_results;

ALTER TABLE public.recruitment_automation_executions
  DROP CONSTRAINT IF EXISTS recruitment_automation_executions_action_result_check;
ALTER TABLE public.recruitment_automation_executions
  ADD CONSTRAINT recruitment_automation_executions_overall_status_check
  CHECK (overall_status IN ('success', 'failed', 'skipped', 'dry_run'));

COMMENT ON COLUMN public.recruitment_automation_executions.action_results IS
  'Shape: {"success": bool, "error": text|null, "duration_ms": int, "preview": text|null, "http_status": int|null, "response_excerpt": text|null}. Single object matching one-action-per-rule model. preview populated for dry_run only. http_status + response_excerpt populated for webhook/email actions that go through an edge function.';

-- ============================================================================
-- Part B — render_email_template helper
-- Renders subject + body with \n -> <br> conversion and a fixed set of
-- placeholders. Unknown {{placeholders}} stay literal.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.render_email_template(
  p_template_id    uuid,
  p_application_id uuid
)
RETURNS TABLE (subject text, html text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template   record;
  v_context    record;
  v_subject    text;
  v_html       text;
BEGIN
  -- TODO(v2): HTML-escape substituted values if templates start including
  -- user-controlled fields beyond names. Current scope trusts applicant
  -- name/position/org fields as safe HTML. Would need an html_escape()
  -- helper for & < > " ' — not worth the plpgsql complexity for v1.

  SELECT id, subject, body
    INTO v_template
  FROM public.recruitment_email_templates
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template % not found', p_template_id;
  END IF;

  SELECT a.first_name,
         a.last_name,
         jp.title AS position_title,
         o.name   AS org_name
    INTO v_context
  FROM public.applications       app
  JOIN public.applicants         a  ON a.id  = app.applicant_id
  JOIN public.job_positions      jp ON jp.id = app.position_id
  JOIN public.organizations      o  ON o.id  = app.organization_id
  WHERE app.id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application % not found or missing required relations', p_application_id;
  END IF;

  -- Convert plaintext newlines to <br> BEFORE placeholder substitution
  -- so applicant-provided values can't smuggle newlines into the email body.
  v_subject := replace(v_template.subject, E'\n', '<br>');
  v_html    := replace(v_template.body,    E'\n', '<br>');

  -- Placeholder substitution (COALESCE nullable fields to empty string)
  v_subject := replace(v_subject, '{{first_name}}',     COALESCE(v_context.first_name,     ''));
  v_subject := replace(v_subject, '{{last_name}}',      COALESCE(v_context.last_name,      ''));
  v_subject := replace(v_subject, '{{position_title}}', COALESCE(v_context.position_title, ''));
  v_subject := replace(v_subject, '{{company_name}}',   COALESCE(v_context.org_name,       ''));

  v_html := replace(v_html, '{{first_name}}',     COALESCE(v_context.first_name,     ''));
  v_html := replace(v_html, '{{last_name}}',      COALESCE(v_context.last_name,      ''));
  v_html := replace(v_html, '{{position_title}}', COALESCE(v_context.position_title, ''));
  v_html := replace(v_html, '{{company_name}}',   COALESCE(v_context.org_name,       ''));

  RETURN QUERY SELECT v_subject, v_html;
END;
$$;

COMMENT ON FUNCTION public.render_email_template(uuid, uuid) IS
  'Renders a recruitment_email_templates row for a given application. Converts \n -> <br> on both subject and body, then substitutes {{first_name}}, {{last_name}}, {{position_title}}, {{company_name}}. Unknown placeholders stay literal. Internal helper — no GRANT to authenticated.';

-- ============================================================================
-- Part C — rule_matches_context helper
-- Pure predicate: does this rule''s trigger_config match this trigger_context?
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rule_matches_context(
  p_trigger_type    text,
  p_trigger_config  jsonb,
  p_trigger_context jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_trigger_type
    WHEN 'stage_entered' THEN
      -- Match if no stage_id filter OR config.stage_id = context.to_stage_id
      RETURN p_trigger_config->>'stage_id' IS NULL
          OR p_trigger_config->>'stage_id' = p_trigger_context->>'to_stage_id';

    WHEN 'application_created' THEN
      -- Always fires when type matches; optional position_id filter
      RETURN p_trigger_config->>'position_id' IS NULL
          OR p_trigger_config->>'position_id' = p_trigger_context->>'position_id';

    WHEN 'position_published', 'inactivity_timeout' THEN
      -- Not in v1; rules with these triggers never match
      RETURN false;

    ELSE
      RETURN false;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.rule_matches_context(text, jsonb, jsonb) IS
  'Predicate for whether an automation rule''s trigger_config matches a given trigger_context. Internal helper — no GRANT to authenticated.';

-- ============================================================================
-- Part D — dispatch_action helper
-- Executes a single action for a single rule. Returns action_results jsonb.
-- Network failures are caught and returned as structured error; never raised
-- out (except for send_sms / create_task / unknown, which raise loudly).
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
SET search_path = public, extensions
AS $$
DECLARE
  v_start_time      timestamptz := clock_timestamp();
  v_application_id  uuid;
  v_applicant_email text;
  v_rendered        record;
  v_service_key     text;
  v_request_id      bigint;
  v_response        record;
  v_status_code     integer;
  v_body_text       text;
  v_excerpt         text;
  -- TODO: move edge function URLs to vault/config post-v1
  v_send_email_url      constant text := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/send-email';
  v_dispatch_webhook_url constant text := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/dispatch-webhook';
BEGIN
  v_application_id := (p_trigger_context->>'application_id')::uuid;

  CASE p_action_type

    -- ============== send_email ==============
    WHEN 'send_email' THEN
      IF p_action_config->>'template_id' IS NULL THEN
        RETURN jsonb_build_object(
          'success',     false,
          'error',       'send_email requires template_id in action_config',
          'duration_ms', 0
        );
      END IF;

      -- Resolve recipient
      SELECT a.email INTO v_applicant_email
      FROM public.applications app
      JOIN public.applicants a ON a.id = app.applicant_id
      WHERE app.id = v_application_id;

      IF v_applicant_email IS NULL THEN
        RETURN jsonb_build_object(
          'success',     false,
          'error',       'Recipient email not found for application ' || COALESCE(v_application_id::text, 'null'),
          'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
        );
      END IF;

      -- Render template (may raise on missing template/application — propagate)
      SELECT subject, html
        INTO v_rendered
      FROM public.render_email_template(
        (p_action_config->>'template_id')::uuid,
        v_application_id
      );

      IF p_dry_run THEN
        RETURN jsonb_build_object(
          'success',     true,
          'preview',     'Would send "' || v_rendered.subject || '" to ' || v_applicant_email,
          'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
        );
      END IF;

      -- Fetch service role key from vault
      SELECT decrypted_secret INTO v_service_key
      FROM vault.decrypted_secrets
      WHERE name = 'service_role_key';

      IF v_service_key IS NULL THEN
        RETURN jsonb_build_object(
          'success',     false,
          'error',       'service_role_key not configured in vault',
          'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
        );
      END IF;

      -- POST to send-email edge function, capture network errors
      BEGIN
        SELECT net.http_post(
          url     := v_send_email_url,
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || v_service_key,
            'Content-Type',  'application/json'
          ),
          body    := jsonb_build_object(
            'to',      v_applicant_email,
            'subject', v_rendered.subject,
            'html',    v_rendered.html
          ),
          timeout_milliseconds := 15000
        ) INTO v_request_id;

        -- Collect response synchronously
        SELECT status_code, content
          INTO v_response
        FROM net._http_collect_response(v_request_id, async := false);

        v_status_code := v_response.status_code;
        v_body_text   := v_response.content;
        v_excerpt     := LEFT(COALESCE(v_body_text, ''), 2048);

        RETURN jsonb_build_object(
          'success',          v_status_code BETWEEN 200 AND 299,
          'http_status',      v_status_code,
          'response_excerpt', v_excerpt,
          'duration_ms',      (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int,
          'error',            CASE WHEN v_status_code BETWEEN 200 AND 299 THEN NULL
                                   ELSE 'send-email returned HTTP ' || v_status_code END
        );
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'success',     false,
          'error',       'send_email network failure: ' || SQLERRM,
          'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
        );
      END;

    -- ============== assign_to ==============
    WHEN 'assign_to' THEN
      IF p_action_config->>'user_id' IS NULL THEN
        RETURN jsonb_build_object(
          'success',     false,
          'error',       'assign_to requires user_id (profile id) in action_config',
          'duration_ms', 0
        );
      END IF;

      IF p_dry_run THEN
        RETURN jsonb_build_object(
          'success',     true,
          'preview',     'Would assign application ' || COALESCE(v_application_id::text, 'null') ||
                         ' to profile ' || (p_action_config->>'user_id'),
          'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
        );
      END IF;

      UPDATE public.applications
      SET assigned_to = (p_action_config->>'user_id')::uuid
      WHERE id = v_application_id;

      RETURN jsonb_build_object(
        'success',     true,
        'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
      );

    -- ============== webhook ==============
    WHEN 'webhook' THEN
      IF p_action_config->>'url' IS NULL THEN
        RETURN jsonb_build_object(
          'success',     false,
          'error',       'webhook requires url in action_config',
          'duration_ms', 0
        );
      END IF;

      IF p_dry_run THEN
        RETURN jsonb_build_object(
          'success',     true,
          'preview',     'Would POST to ' || (p_action_config->>'url'),
          'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
        );
      END IF;

      SELECT decrypted_secret INTO v_service_key
      FROM vault.decrypted_secrets
      WHERE name = 'service_role_key';

      IF v_service_key IS NULL THEN
        RETURN jsonb_build_object(
          'success',     false,
          'error',       'service_role_key not configured in vault',
          'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
        );
      END IF;

      BEGIN
        SELECT net.http_post(
          url     := v_dispatch_webhook_url,
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || v_service_key,
            'Content-Type',  'application/json'
          ),
          body    := jsonb_build_object(
            'url',              p_action_config->>'url',
            'headers',          p_action_config->'headers',
            'message_template', p_action_config->>'message_template',
            'body', jsonb_build_object(
              'context', p_trigger_context,
              'action',  p_action_config
            )
          ),
          timeout_milliseconds := 15000
        ) INTO v_request_id;

        SELECT status_code, content
          INTO v_response
        FROM net._http_collect_response(v_request_id, async := false);

        v_status_code := v_response.status_code;
        v_body_text   := v_response.content;
        v_excerpt     := LEFT(COALESCE(v_body_text, ''), 2048);

        RETURN jsonb_build_object(
          'success',          v_status_code BETWEEN 200 AND 299,
          'http_status',      v_status_code,
          'response_excerpt', v_excerpt,
          'duration_ms',      (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int,
          'error',            CASE WHEN v_status_code BETWEEN 200 AND 299 THEN NULL
                                   ELSE 'dispatch-webhook returned HTTP ' || v_status_code END
        );
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'success',     false,
          'error',       'webhook network failure: ' || SQLERRM,
          'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
        );
      END;

    -- ============== send_sms (parked) ==============
    WHEN 'send_sms' THEN
      RAISE EXCEPTION 'Action send_sms is not implemented in v1. Configure a different action type.';

    -- ============== create_task (parked) ==============
    WHEN 'create_task' THEN
      RAISE EXCEPTION 'Action create_task is not implemented in v1. Configure a different action type.';

    ELSE
      RAISE EXCEPTION 'Unknown action_type: %', p_action_type;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.dispatch_action(text, jsonb, jsonb, uuid, boolean) IS
  'Executes a single action for an automation rule. Returns structured action_results jsonb. Uses vault.service_role_key + pg_net to invoke send-email / dispatch-webhook edge functions. Internal helper — no GRANT to authenticated.';

-- ============================================================================
-- Part E — execute_automation_rules entry point
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_automation_rules(
  p_trigger_type     text,
  p_trigger_context  jsonb,
  p_dry_run          boolean DEFAULT false
)
RETURNS TABLE (
  rule_id         uuid,
  rule_name       text,
  overall_status  text,
  action_results  jsonb,
  duration_ms     integer
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
  v_start          timestamptz;
  v_duration_ms    integer;
  v_action_results jsonb;
  v_status         text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT id, organization_id INTO v_profile_id, v_org_id
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for user %', v_user_id;
  END IF;

  -- Iterate matching active rules in the caller's org
  FOR v_rule IN
    SELECT *
    FROM public.recruitment_automation_rules
    WHERE organization_id = v_org_id
      AND trigger_type    = p_trigger_type
      AND is_active       = true
      AND public.rule_matches_context(trigger_type, trigger_config, p_trigger_context)
    ORDER BY execution_order ASC, created_at ASC
  LOOP
    v_start := clock_timestamp();

    -- Catch anything dispatch_action raises (send_sms / create_task / unknown / render errors)
    BEGIN
      v_action_results := public.dispatch_action(
        v_rule.action_type,
        v_rule.action_config,
        p_trigger_context,
        v_profile_id,
        p_dry_run
      );
    EXCEPTION WHEN OTHERS THEN
      v_action_results := jsonb_build_object(
        'success',     false,
        'error',       'dispatch_action raised: ' || SQLERRM,
        'duration_ms', 0
      );
    END;

    v_duration_ms := (EXTRACT(epoch FROM (clock_timestamp() - v_start)) * 1000)::integer;

    v_status := CASE
      WHEN p_dry_run                              THEN 'dry_run'
      WHEN (v_action_results->>'success')::boolean IS TRUE THEN 'success'
      ELSE                                             'failed'
    END;

    -- Always log (including dry_run — user explicitly opted into it)
    INSERT INTO public.recruitment_automation_executions (
      organization_id, rule_id, rule_name,
      application_id, applicant_id,
      triggered_by, trigger_context,
      action_results, overall_status,
      is_dry_run, duration_ms
    ) VALUES (
      v_org_id,
      v_rule.id,
      v_rule.name,
      NULLIF(p_trigger_context->>'application_id', '')::uuid,
      NULLIF(p_trigger_context->>'applicant_id',   '')::uuid,
      v_profile_id,
      p_trigger_context,
      v_action_results,
      v_status,
      p_dry_run,
      v_duration_ms
    );

    -- Only bump stats on real runs
    IF NOT p_dry_run THEN
      UPDATE public.recruitment_automation_rules
      SET last_executed_at = now(),
          execution_count  = execution_count + 1
      WHERE id = v_rule.id;
    END IF;

    rule_id        := v_rule.id;
    rule_name      := v_rule.name;
    overall_status := v_status;
    action_results := v_action_results;
    duration_ms    := v_duration_ms;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_automation_rules(text, jsonb, boolean) TO authenticated;

COMMENT ON FUNCTION public.execute_automation_rules(text, jsonb, boolean) IS
  'Entry point for automation rule execution. Called from client hooks (stage_entered, application_created). Finds matching rules, dispatches each action via dispatch_action, logs each execution row, updates rule stats on non-dry-run, returns per-rule results. Authorized to any authenticated user; inner logic scopes to caller''s organization.';
