CREATE OR REPLACE FUNCTION public.gdpr_erase_applicant(p_applicant_id uuid, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id UUID;
  v_already_anonymized TIMESTAMPTZ;
  v_summary JSONB := '[]'::jsonb;
  v_count INT;
  v_file_paths TEXT[];
BEGIN
  SELECT organization_id, anonymized_at
    INTO v_org_id, v_already_anonymized
    FROM public.applicants
    WHERE id = p_applicant_id
    FOR UPDATE;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Applicant % not found', p_applicant_id;
  END IF;

  IF v_already_anonymized IS NOT NULL THEN
    RETURN jsonb_build_object(
      'already_anonymized', true,
      'anonymized_at', v_already_anonymized,
      'tables_affected', '[]'::jsonb,
      'file_paths', '[]'::jsonb
    );
  END IF;

  -- (a) Applicants row — scrub PII; respect NOT NULL constraints.
  UPDATE public.applicants SET
    first_name              = '[ANONYMIZED]',
    last_name               = '[ANONYMIZED]',
    email                   = 'anonymized-' || id::text || '@deleted.invalid',
    phone                   = NULL,
    location                = NULL,
    source_details          = '{}'::jsonb,
    drivers_license_classes = '{}'::text[],
    certifications          = '{}'::text[],
    metadata                = '{}'::jsonb,
    external_id             = NULL,
    anonymized_at           = now(),
    updated_at              = now()
  WHERE id = p_applicant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','applicants','rows',v_count));

  -- (b) Custom field values
  UPDATE public.recruitment_applicant_field_values
    SET value = jsonb_build_object('anonymized', true),
        raw_value = '[ANONYMIZED]',
        updated_at = now()
    WHERE applicant_id = p_applicant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','recruitment_applicant_field_values','rows',v_count));

  -- (c) Candidate form tokens
  UPDATE public.candidate_form_tokens SET
    submitted_ip = NULL,
    submitted_user_agent = NULL,
    last_attempt_ip = NULL,
    revoked_at = COALESCE(revoked_at, now())
  WHERE applicant_id = p_applicant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','candidate_form_tokens','rows',v_count));

  -- (d) Recruiter notes
  UPDATE public.applicant_notes SET
    content = '[ANONYMIZED]',
    updated_at = now()
  WHERE applicant_id = p_applicant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','applicant_notes','rows',v_count));

  -- (e) Inbound messages — scrub
  UPDATE public.messages SET
    content = '[ANONYMIZED]',
    email_subject = CASE WHEN email_subject IS NOT NULL THEN '[ANONYMIZED]' ELSE NULL END,
    email_headers = NULL,
    updated_at = now()
  WHERE conversation_id IN (
        SELECT conversation_id FROM public.applicant_conversations
        WHERE applicant_id = p_applicant_id AND conversation_id IS NOT NULL
      )
    AND sender_type NOT IN ('agent','system','bot');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','messages_inbound','rows',v_count));

  -- (f) Pending scoring queue rows
  DELETE FROM public.application_scoring_queue
    WHERE application_id IN (SELECT id FROM public.applications WHERE applicant_id = p_applicant_id)
      AND status IN ('pending','processing','failed');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','application_scoring_queue','rows',v_count));

  -- (g) Applicant files — collect storage paths
  SELECT COALESCE(array_agg(storage_path), ARRAY[]::text[])
    INTO v_file_paths
    FROM public.applicant_files
    WHERE applicant_id = p_applicant_id AND storage_path IS NOT NULL;

  UPDATE public.applicant_files SET
    storage_path = NULL,
    deleted_at = COALESCE(deleted_at, now())
  WHERE applicant_id = p_applicant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','applicant_files','rows',v_count));

  RETURN jsonb_build_object(
    'already_anonymized', false,
    'tables_affected', v_summary,
    'file_paths', to_jsonb(v_file_paths)
  );
END;
$function$;