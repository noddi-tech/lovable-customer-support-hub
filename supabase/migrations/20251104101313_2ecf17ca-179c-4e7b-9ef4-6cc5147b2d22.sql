-- Step 2 & 3: Enable RLS and add security policies

-- Enable RLS on the table
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Add SELECT policy for super admins
CREATE POLICY "Super admins can view all audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Add INSERT policy for authenticated users
CREATE POLICY "System can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());