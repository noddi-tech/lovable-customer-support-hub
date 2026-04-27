CREATE OR REPLACE FUNCTION public.dispatch_action(
  p_action_type text, 
  p_action_config jsonb, 
  p_trigger_context jsonb, 
  p_actor_profile_id uuid, 
  p_dry_run boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_start_time      timestamptz := clock_timestamp();
  v_application_id  uuid;
  v_applicant_id    uuid;
  v_applicant_email text;
  v_applicant_name  text;
  v_template        record;
  v_assigned_user   record;
BEGIN
  IF NOT p_dry_run THEN
    RAISE EXCEPTION 'dispatch_action is dry-run only post-Phase 1.5. Real runs must go through process-automation-queue edge function.';
  END IF;

  v_application_id := NULLIF(p_trigger_context->>'application_id', '')::uuid;
  v_applicant_id   := NULLIF(p_trigger_context->>'applicant_id', '')::uuid;

  CASE p_action_type

    WHEN 'send_email' THEN
      IF p_action_config->>'template_id' IS NULL THEN
        RETURN jsonb_build_array(jsonb_build_object(
          'action_type', 'send_email',
          'simulated',   true,
          'success',     false,
          'error',       'send_email requires template_id in action_config',
          'duration_ms', 0
        ));
      END IF;

      IF v_application_id IS NOT NULL THEN
        SELECT a.email, COALESCE(NULLIF(TRIM(CONCAT(a.first_name, ' ', a.last_name)), ''), a.email)
        INTO v_applicant_email, v_applicant_name
        FROM public.applications app
        JOIN public.applicants a ON a.id = app.applicant_id
        WHERE app.id = v_application_id;
      END IF;

      IF v_applicant_email IS NULL AND v_applicant_id IS NOT NULL THEN
        SELECT email, COALESCE(NULLIF(TRIM(CONCAT(first_name, ' ', last_name)), ''), email)
        INTO v_applicant_email, v_applicant_name
        FROM public.applicants
        WHERE id = v_applicant_id;
      END IF;

      SELECT id, name, subject INTO v_template
      FROM public.recruitment_email_templates
      WHERE id = (p_action_config->>'template_id')::uuid;

      IF NOT FOUND THEN
        RETURN jsonb_build_array(jsonb_build_object(
          'action_type', 'send_email',
          'simulated',   true,
          'success',     false,
          'error',       'Template not found',
          'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
        ));
      END IF;

      RETURN jsonb_build_array(jsonb_build_object(
        'action_type',     'send_email',
        'simulated',       true,
        'success',         (v_applicant_email IS NOT NULL),
        'recipient',       COALESCE(v_applicant_email, '<ingen e-post>'),
        'recipient_name',  COALESCE(v_applicant_name, '<ukjent>'),
        'template_id',     v_template.id,
        'template_name',   v_template.name,
        'subject_preview', v_template.subject,
        'error',           CASE WHEN v_applicant_email IS NULL 
                                THEN 'Søker har ingen e-postadresse' 
                                ELSE NULL END,
        'duration_ms',     (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
      ));

    WHEN 'assign_to' THEN
      IF p_action_config->>'user_id' IS NULL THEN
        RETURN jsonb_build_array(jsonb_build_object(
          'action_type', 'assign_to',
          'simulated',   true,
          'success',     false,
          'error',       'assign_to requires user_id in action_config',
          'duration_ms', 0
        ));
      END IF;

      SELECT id, COALESCE(full_name, email) AS display_name INTO v_assigned_user
      FROM public.profiles
      WHERE id = (p_action_config->>'user_id')::uuid;

      RETURN jsonb_build_array(jsonb_build_object(
        'action_type',       'assign_to',
        'simulated',         true,
        'success',           FOUND,
        'assigned_to',       p_action_config->>'user_id',
        'assigned_to_name',  COALESCE(v_assigned_user.display_name, '<ukjent bruker>'),
        'error',             CASE WHEN NOT FOUND 
                                  THEN 'Bruker ikke funnet' 
                                  ELSE NULL END,
        'duration_ms',       (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
      ));

    WHEN 'webhook' THEN
      RETURN jsonb_build_array(jsonb_build_object(
        'action_type', 'webhook',
        'simulated',   true,
        'success',     (p_action_config->>'url' IS NOT NULL),
        'url',         COALESCE(p_action_config->>'url', '<ingen URL>'),
        'method',      'POST',
        'error',       CASE WHEN p_action_config->>'url' IS NULL 
                            THEN 'Webhook URL mangler i konfigurasjon' 
                            ELSE NULL END,
        'duration_ms', (EXTRACT(epoch FROM (clock_timestamp() - v_start_time)) * 1000)::int
      ));

    WHEN 'send_sms' THEN
      RAISE EXCEPTION 'Action send_sms is not implemented in v1. Configure a different action type.';

    WHEN 'create_task' THEN
      RAISE EXCEPTION 'Action create_task is not implemented in v1. Configure a different action type.';

    ELSE
      RAISE EXCEPTION 'Unknown action_type: %', p_action_type;
  END CASE;
END;
$function$;