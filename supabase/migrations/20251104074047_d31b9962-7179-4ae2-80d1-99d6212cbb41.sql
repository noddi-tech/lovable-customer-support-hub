-- Add comprehensive RLS policies to profiles table
-- This fixes the issue where no users are visible due to missing policies

-- SELECT Policies: Allow viewing profiles based on role and organization

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_super_admin()
);

-- Users can view profiles in their organization or their own profile
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id() OR
  auth.uid() = user_id
);

-- UPDATE Policies: Allow updating profiles based on permissions

-- Super admins can update any profile
CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
)
WITH CHECK (
  is_super_admin()
);

-- Admins with manage_users permission can update profiles in their organization
CREATE POLICY "Admins can update profiles in their organization"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  has_permission(auth.uid(), 'manage_users'::app_permission) AND
  organization_id = get_user_organization_id()
)
WITH CHECK (
  has_permission(auth.uid(), 'manage_users'::app_permission) AND
  organization_id = get_user_organization_id()
);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- INSERT Policies: Allow creating profiles based on permissions

-- Super admins can insert any profile
CREATE POLICY "Super admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
);

-- Admins with manage_users permission can insert profiles in their organization
CREATE POLICY "Admins can insert profiles in their organization"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  has_permission(auth.uid(), 'manage_users'::app_permission) AND
  organization_id = get_user_organization_id()
);

-- DELETE Policies: Only super admins can delete profiles

-- Super admins can delete any profile
CREATE POLICY "Super admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  is_super_admin()
);