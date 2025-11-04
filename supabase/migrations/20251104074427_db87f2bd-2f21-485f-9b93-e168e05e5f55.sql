-- Add SELECT policy for super admins to view all organizations
-- This fixes the issue where the All Users page can't load organization details

CREATE POLICY "Super admins can view all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  is_super_admin()
);