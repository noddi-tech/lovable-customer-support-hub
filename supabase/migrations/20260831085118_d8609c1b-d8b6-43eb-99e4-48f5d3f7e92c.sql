-- 1. Storage: message-attachments -------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Service role can insert attachments" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete attachments" ON storage.objects;

CREATE POLICY "Org members can delete their attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT om.organization_id::text
    FROM organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

-- 2. Storage: voicemails -----------------------------------------------------
DROP POLICY IF EXISTS "Org members can read voicemails" ON storage.objects;

-- 3. admin_audit_logs: only admins may write audit rows ----------------------
DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_logs;

CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_logs FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (
    public.is_super_admin()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 4. Meta data-deletion requests: no broad public reads ----------------------
DROP POLICY IF EXISTS "Public can read deletion request status" ON public.recruitment_meta_data_deletion_requests;

CREATE OR REPLACE FUNCTION public.get_meta_deletion_request_status(_code text)
RETURNS TABLE (
  confirmation_code text,
  status text,
  created_at timestamptz,
  completed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.confirmation_code, r.status, r.created_at, r.completed_at
  FROM public.recruitment_meta_data_deletion_requests r
  WHERE _code IS NOT NULL
    AND length(_code) >= 8
    AND r.confirmation_code = _code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_meta_deletion_request_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_meta_deletion_request_status(text) TO anon, authenticated;

-- 5. Tighten EXECUTE on SECURITY DEFINER functions ---------------------------
DO $$
DECLARE
  fn record;
  server_only text[] := ARRAY[
    'gdpr_erase_applicant','claim_queue_row','finalize_queue_row','check_rate_limit',
    'auto_close_inactive_conversations','dispatch_action','create_test_notification',
    'enqueue_initial_scoring_for_position','detect_suspicious_audit_activity',
    'count_old_audit_logs'
  ];
  anon_unused text[] := ARRAY[
    'get_user_organization_from_profile','recruitment_applicant_in_user_org',
    'recruitment_bulk_import_in_user_org','is_organization_member',
    'recruitment_template_accessible','recruitment_template_writable',
    'recruitment_form_mapping_in_user_org'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF fn.proname = ANY(server_only) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    ELSIF fn.proname = ANY(anon_unused) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
    END IF;
  END LOOP;
END $$;