-- Fix runtime ambiguity in render_email_template.
--
-- The original RETURNS TABLE (subject text, html text) clashed at
-- runtime with internal name resolution — column refs like
-- v_template.subject / v_template.body and the inline SELECT column
-- labels competed for the unqualified names "subject" and "html".
-- CREATE FUNCTION accepted the syntax but execution raised:
--     column reference "subject" is ambiguous
--
-- Found by Test 5 (dry-run of send_email rule). Caught pre-production.
-- Prior fix 6b0f9769 (pg_net response shape) addressed a different
-- runtime issue and was independent of this one.
--
-- Fix: rename output columns to rendered_subject / rendered_html, alias
-- every SELECT INTO column so no name shadows the output table, and
-- use the explicit "rendered_X := ...; RETURN NEXT;" pattern instead
-- of "RETURN QUERY SELECT ...".
--
-- dispatch_action's send_email branch is updated in the same migration
-- to call the renamed output columns.

-- ============================================================================
-- render_email_template — renamed output cols + alias all SELECT INTO cols
-- DROP + CREATE because CREATE OR REPLACE cannot change OUT parameter names.
-- dispatch_action references this by name+args (resolved at call time), so
-- dropping here is safe — the fresh CREATE restores the reference when the
-- RPC body is re-executed. Still, the dispatch_action CREATE OR REPLACE
-- below in the same migration brings it back up to a matching call shape.
-- ============================================================================

DROP FUNCTION IF EXISTS public.render_email_template(uuid, uuid);

CREATE FUNCTION public.render_email_template(
  p_template_id    uuid,
  p_application_id uuid
)
RETURNS TABLE (rendered_subject text, rendered_html text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template  record;
  v_context   record;
  v_subject   text;
  v_html      text;
BEGIN
  SELECT t.id,
         t.subject AS tpl_subject,
         t.body    AS tpl_body,
         t.organization_id
    INTO v_template
  FROM public.recruitment_email_templates t
  WHERE t.id = p_template_id
    AND t.soft_deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template % not found or soft-deleted', p_template_id;
  END IF;

  SELECT a.first_name AS app_first_name,
         a.last_name  AS app_last_name,
         jp.title     AS pos_title,
         o.name       AS org_name
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
  v_subject := replace(v_template.tpl_subject, E'\n', '<br>');
  v_html    := replace(v_template.tpl_body,    E'\n', '<br>');

  -- TODO(v2): HTML-escape substituted values if templates start including
  -- user-controlled fields beyond names. Current scope trusts applicant
  -- name/position/org fields as safe HTML. Would need an html_escape()
  -- helper for & < > " ' — not worth the plpgsql complexity for v1.
  v_subject := replace(v_subject, '{{first_name}}',     COALESCE(v_context.app_first_name, ''));
  v_subject := replace(v_subject, '{{last_name}}',      COALESCE(v_context.app_last_name,  ''));
  v_subject := replace(v_subject, '{{position_title}}', COALESCE(v_context.pos_title,      ''));
  v_subject := replace(v_subject, '{{company_name}}',   COALESCE(v_context.org_name,       ''));

  v_html := replace(v_html, '{{first_name}}',     COALESCE(v_context.app_first_name, ''));
  v_html := replace(v_html, '{{last_name}}',      COALESCE(v_context.app_last_name,  ''));
  v_html := replace(v_html, '{{position_title}}', COALESCE(v_context.pos_title,      ''));
  v_html := replace(v_html, '{{company_name}}',   COALESCE(v_context.org_name,       ''));

  rendered_subject := v_subject;
  rendered_html    := v_html;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.render_email_template(uuid, uuid) IS
  'Renders a recruitment_email_templates row for a given application. Converts \n -> <br> on both subject and body, then substitutes {{first_name}}, {{last_name}}, {{position_title}}, {{company_name}}. Unknown placeholders stay literal. Output columns named rendered_subject/rendered_html to avoid name-resolution ambiguity with internal variables. Internal helper — no GRANT to authenticated.';

-- ============================================================================
-- dispatch_action — update send_email branch's call site to use the
-- renamed output columns. Preserves Commit 6b0f9769's pg_net response
-- shape fix (no regressions there).
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
  v_result          net.http_response_result;
  v_status_code     integer;
  v_body_text       text;
  v_excerpt         text;
  -- TODO: move edge function URLs to vault/config post-v1
  v_send_email_url       constant text := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/send-email';
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

      -- Call render_email_template with the renamed output columns
      SELECT rendered_subject, rendered_html
        INTO v_rendered
      FROM public.render_email_template(
        (p_action_config->>'template_id')::uuid,
        v_application_id
      );

      IF p_dry_run THEN
        RETURN jsonb_build_object(
          'success',     true,
          'preview',     'Would send "' || v_rendered.rendered_subject || '" to ' || v_applicant_email,
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
          url     := v_send_email_url,
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || v_service_key,
            'Content-Type',  'application/json'
          ),
          body    := jsonb_build_object(
            'to',      v_applicant_email,
            'subject', v_rendered.rendered_subject,
            'html',    v_rendered.rendered_html
          ),
          timeout_milliseconds := 15000
        ) INTO v_request_id;

        v_result      := net._http_collect_response(v_request_id, async := false);
        v_status_code := (v_result.response).status_code;
        v_body_text   := (v_result.response).body;
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

        v_result      := net._http_collect_response(v_request_id, async := false);
        v_status_code := (v_result.response).status_code;
        v_body_text   := (v_result.response).body;
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
  'Executes a single action for an automation rule. Returns structured action_results jsonb. Uses vault.service_role_key + pg_net to invoke send-email / dispatch-webhook edge functions. Accesses pg_net response via nested composite: (v_result.response).status_code / (v_result.response).body. Calls render_email_template with renamed output columns rendered_subject / rendered_html. Internal helper — no GRANT to authenticated.';
