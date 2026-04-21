-- Fix dispatch_action's access to pg_net's response shape.
--
-- Commit 53a709a9 introduced dispatch_action with:
--
--     SELECT status_code, content INTO v_response
--     FROM net._http_collect_response(v_request_id, async := false);
--     ...
--     v_status_code := v_response.status_code;
--     v_body_text   := v_response.content;
--
-- That assumes a flat record — but net.http_response_result is a nested
-- composite:
--
--     net.http_response_result = (status net.request_status, message text,
--                                 response net.http_response)
--     net.http_response        = (status_code integer, headers jsonb,
--                                 body text)    -- note: "body", not "content"
--
-- CREATE FUNCTION doesn't validate plpgsql field access, so the bug was
-- hidden until runtime. First real dispatch_action for send_email or
-- webhook would have thrown:
--     column status_code not found in data type net.http_response_result
--
-- This CREATE OR REPLACE corrects both branches.

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
            'subject', v_rendered.subject,
            'html',    v_rendered.html
          ),
          timeout_milliseconds := 15000
        ) INTO v_request_id;

        -- Correct access: result is composite (status, message, response);
        -- response is itself composite (status_code, headers, body).
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
  'Executes a single action for an automation rule. Returns structured action_results jsonb. Uses vault.service_role_key + pg_net to invoke send-email / dispatch-webhook edge functions. Accesses pg_net response via nested composite: (v_result.response).status_code / (v_result.response).body. Internal helper — no GRANT to authenticated.';
