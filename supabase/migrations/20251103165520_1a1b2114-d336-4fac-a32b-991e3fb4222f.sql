-- Drop old restrictive policy on user_roles
DROP POLICY IF EXISTS "Users in same organization can view user roles" ON public.user_roles;

-- Create new policy that allows users to see their own roles
CREATE POLICY "Users can view own roles and admins can manage" 
ON public.user_roles FOR SELECT
TO authenticated
USING (
  -- Users can always see their own roles (CRITICAL for super admin detection)
  user_id = auth.uid()
  OR
  -- Super admins can see all roles
  is_super_admin()
  OR  
  -- Admins can see roles in their organization
  (has_permission(auth.uid(), 'manage_users'::app_permission) 
   AND get_user_organization_from_profile(user_id) = get_user_organization_id())
);