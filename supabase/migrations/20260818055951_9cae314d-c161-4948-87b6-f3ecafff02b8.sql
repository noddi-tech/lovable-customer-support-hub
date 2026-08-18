-- 1. call_notes: respect is_private
DROP POLICY IF EXISTS "Users can view call notes in their organization" ON public.call_notes;
CREATE POLICY "Users can view call notes in their organization"
ON public.call_notes FOR SELECT
USING (
  organization_id = public.get_user_organization_id()
  AND (
    is_private IS NOT TRUE
    OR created_by_id = auth.uid()
    OR public.has_permission(auth.uid(), 'manage_users'::app_permission)
  )
);

-- 2. debug_logs: remove permissive time-based policy
DROP POLICY IF EXISTS "Auto-expire old debug logs" ON public.debug_logs;

-- 3. storage: drop spoofable anon visitor policies (unused by the widget)
DROP POLICY IF EXISTS "Widget visitors can view their conversation attachments" ON storage.objects;
DROP POLICY IF EXISTS "Widget visitors can upload to their conversation" ON storage.objects;

-- 4. widget bucket: admin-only writes
DROP POLICY IF EXISTS "Admins can upload widget files" ON storage.objects;
CREATE POLICY "Admins can upload widget files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'widget' AND EXISTS (
    SELECT 1 FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
      AND om.role IN ('admin','super_admin')
  )
);
CREATE POLICY "Admins can update widget files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'widget' AND EXISTS (
    SELECT 1 FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
      AND om.role IN ('admin','super_admin')
  )
)
WITH CHECK (
  bucket_id = 'widget' AND EXISTS (
    SELECT 1 FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
      AND om.role IN ('admin','super_admin')
  )
);
CREATE POLICY "Admins can delete widget files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'widget' AND EXISTS (
    SELECT 1 FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
      AND om.role IN ('admin','super_admin')
  )
);

-- 5. Fixed search_path for remaining functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proconfig IS NULL AND p.prokind = 'f'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END $$;

-- 6. Lock down SECURITY DEFINER function execution
DO $$
DECLARE r record;
BEGIN
  -- trigger functions never need direct EXECUTE by API roles
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND pg_get_function_result(p.oid) = 'trigger'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', r.sig);
  END LOOP;

  -- anonymous callers get no SECURITY DEFINER RPCs except the widget agent-presence counter
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname <> 'get_online_agent_count'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;

  -- internal maintenance / cron / service-role-only routines: not callable by signed-in users
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname IN (
        'auto_abandon_inactive_chat_sessions','auto_close_inactive_conversations',
        'calculate_sla_breach','claim_queue_row','cleanup_old_email_ingestion_logs',
        'count_old_audit_logs','create_test_notification','detect_suspicious_audit_activity',
        'dispatch_action','enqueue_initial_scoring_for_position','extract_email_date',
        'finalize_queue_row','gdpr_erase_applicant','generate_ticket_number',
        'get_conversations_monitored','get_organization_by_email_domain','get_inbox_for_email',
        'log_audit_export','reap_stuck_queue_rows','relink_calls_to_customers',
        'render_email_template','position_has_resolvable_rubric','get_user_org_cache'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

-- 7. Gmail OAuth state nonces
CREATE TABLE IF NOT EXISTS public.gmail_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce text NOT NULL,
  user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.gmail_oauth_states TO service_role;
ALTER TABLE public.gmail_oauth_states ENABLE ROW LEVEL SECURITY;

-- 8. Persistent rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rate_limit_tracking TO service_role;
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_key text, _limit integer, _window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.rate_limit_tracking AS t (key, count, window_start)
  VALUES (_key, 1, now())
  ON CONFLICT (key) DO UPDATE
    SET count = CASE WHEN t.window_start < now() - make_interval(secs => _window_seconds) THEN 1 ELSE t.count + 1 END,
        window_start = CASE WHEN t.window_start < now() - make_interval(secs => _window_seconds) THEN now() ELSE t.window_start END
  RETURNING t.count INTO v_count;

  RETURN v_count <= _limit;
END;
$$;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;