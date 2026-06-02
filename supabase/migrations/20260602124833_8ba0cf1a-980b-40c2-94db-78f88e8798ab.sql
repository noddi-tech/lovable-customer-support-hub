-- ============================================================
-- Phase 12 (M12.1): GDPR Compliance — schema + atomic RPC
-- ============================================================

-- ---------- 1. gdpr_requests table ----------
CREATE TABLE public.gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  applicant_id UUID NULL REFERENCES public.applicants(id) ON DELETE SET NULL,
  applicant_name_snapshot TEXT NOT NULL,
  applicant_email_snapshot TEXT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('export','erasure')),
  status TEXT NOT NULL CHECK (status IN ('requested','processing','fulfilled','failed')),
  requested_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ NULL,
  fulfillment_summary JSONB NULL,
  error_message TEXT NULL,
  reason_provided TEXT NULL
);

GRANT SELECT ON public.gdpr_requests TO authenticated;
GRANT ALL ON public.gdpr_requests TO service_role;

CREATE INDEX idx_gdpr_requests_org_requested_at
  ON public.gdpr_requests(organization_id, requested_at DESC);

CREATE INDEX idx_gdpr_requests_applicant_type
  ON public.gdpr_requests(applicant_id, request_type)
  WHERE applicant_id IS NOT NULL;

CREATE INDEX idx_gdpr_requests_in_flight
  ON public.gdpr_requests(status)
  WHERE status IN ('requested','processing');

ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's GDPR requests. No INSERT/UPDATE/DELETE
-- policies: writes go through service-role edge functions only; deletes are
-- forbidden indefinitely (compliance record).
CREATE POLICY "Org members can view gdpr requests"
  ON public.gdpr_requests
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

-- ---------- 2. Anonymization flag on applicants ----------
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_applicants_anonymized_at
  ON public.applicants(anonymized_at)
  WHERE anonymized_at IS NOT NULL;

-- ---------- 3. Atomic erasure RPC ----------
-- SECURITY DEFINER, owned by postgres. PL/pgSQL function body runs as a
-- single implicit transaction — any exception rolls back ALL UPDATEs/DELETEs
-- within the call. No explicit COMMIT inside.
-- Storage file deletion is handled by the calling edge function AFTER this
-- function returns successfully; orphan files are swept by the daily cleanup
-- cron (acceptable v1 behavior).
CREATE OR REPLACE FUNCTION public.gdpr_erase_applicant(
  p_applicant_id UUID,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_already_anonymized TIMESTAMPTZ;
  v_summary JSONB := '[]'::jsonb;
  v_count INT;
  v_file_paths TEXT[];
BEGIN
  -- Lock the applicant row for the duration of the transaction
  SELECT organization_id, anonymized_at
    INTO v_org_id, v_already_anonymized
    FROM public.applicants
    WHERE id = p_applicant_id
    FOR UPDATE;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Applicant % not found', p_applicant_id;
  END IF;

  IF v_already_anonymized IS NOT NULL THEN
    -- Idempotent: re-running on an already-anonymized applicant is a no-op
    RETURN jsonb_build_object(
      'already_anonymized', true,
      'anonymized_at', v_already_anonymized,
      'tables_affected', '[]'::jsonb,
      'file_paths', '[]'::jsonb
    );
  END IF;

  -- (a) Applicants row — scrub PII columns. Keep org/source/timestamps/consent
  --     metadata, plus aggregate-only fields (years_experience, language, etc).
  UPDATE public.applicants SET
    first_name = '[ANONYMIZED]',
    last_name = '[ANONYMIZED]',
    email = NULL,
    phone = NULL,
    location = NULL,
    source_details = NULL,
    drivers_license_classes = NULL,
    certifications = NULL,
    metadata = '{}'::jsonb,
    external_id = NULL,
    anonymized_at = now(),
    updated_at = now()
  WHERE id = p_applicant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','applicants','rows',v_count));

  -- (b) Custom field values — scrub every value (free-text + structured alike;
  --     simpler & safer than introspecting field type for PII flag).
  UPDATE public.recruitment_applicant_field_values
    SET value = jsonb_build_object('anonymized', true),
        raw_value = '[ANONYMIZED]',
        updated_at = now()
    WHERE applicant_id = p_applicant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','recruitment_applicant_field_values','rows',v_count));

  -- (c) Candidate form tokens — strip IPs/UA, revoke any active tokens
  UPDATE public.candidate_form_tokens SET
    submitted_ip = NULL,
    submitted_user_agent = NULL,
    last_attempt_ip = NULL,
    revoked_at = COALESCE(revoked_at, now())
  WHERE applicant_id = p_applicant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','candidate_form_tokens','rows',v_count));

  -- (d) Recruiter notes — content may contain PII
  UPDATE public.applicant_notes SET
    content = '[ANONYMIZED]',
    updated_at = now()
  WHERE applicant_id = p_applicant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','applicant_notes','rows',v_count));

  -- (e) Inbound messages tied to this applicant's conversations — scrub
  --     subject/body. Outbound (agent/system) kept intact: we sent it.
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

  -- (f) Pending scoring queue rows — drop (no longer meaningful)
  DELETE FROM public.application_scoring_queue
    WHERE application_id IN (SELECT id FROM public.applications WHERE applicant_id = p_applicant_id)
      AND status IN ('pending','processing','failed');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','application_scoring_queue','rows',v_count));

  -- (g) Applicant files — collect storage paths for the caller to delete from
  --     bucket, then null path columns and mark logical deletion. We DO NOT
  --     delete the rows so audit history "applicant had N files" survives.
  SELECT COALESCE(array_agg(storage_path), ARRAY[]::text[])
    INTO v_file_paths
    FROM public.applicant_files
    WHERE applicant_id = p_applicant_id AND storage_path IS NOT NULL;

  UPDATE public.applicant_files SET
    storage_path = NULL,
    extracted_text = NULL,
    extraction_error = NULL,
    updated_at = now()
  WHERE applicant_id = p_applicant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_array(jsonb_build_object('table','applicant_files','rows',v_count));

  RETURN jsonb_build_object(
    'already_anonymized', false,
    'organization_id', v_org_id,
    'request_id', p_request_id,
    'tables_affected', v_summary,
    'file_paths', to_jsonb(v_file_paths)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gdpr_erase_applicant(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gdpr_erase_applicant(UUID, UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.gdpr_erase_applicant(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.gdpr_erase_applicant(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.gdpr_erase_applicant(UUID, UUID) IS
  'Phase 12 GDPR Art. 17 erasure. Single atomic transaction anonymizes all PII for an applicant while preserving audit trail. Returns JSONB summary including file paths the caller must delete from storage. Idempotent: re-running on already-anonymized applicant is a no-op.';