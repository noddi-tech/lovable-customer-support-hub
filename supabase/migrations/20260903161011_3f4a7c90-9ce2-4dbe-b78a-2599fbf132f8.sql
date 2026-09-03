-- 1. Scope admin audit log inserts to the actor's own organization
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (
    is_super_admin()
    OR (
      has_role(auth.uid(), 'admin'::app_role)
      AND organization_id IS NOT DISTINCT FROM public.get_user_organization_id()
    )
  )
);

-- 2. Scope query performance log reads to the caller's organization
DROP POLICY IF EXISTS "Admins can view performance logs" ON public.query_performance_logs;
CREATE POLICY "Admins can view performance logs"
ON public.query_performance_logs
FOR SELECT
TO authenticated
USING (
  has_permission(auth.uid(), 'manage_settings'::app_permission)
  AND (
    is_super_admin()
    OR organization_id = public.get_user_organization_id()
  )
);

-- 3. SECURITY DEFINER functions must not be callable through the Data API
--    by anonymous visitors, and trigger functions must not be callable at all.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, (p.prorettype = 'trigger'::regtype) AS is_trigger
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
    IF fn.is_trigger THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.sig);
    END IF;
  END LOOP;
END $$;