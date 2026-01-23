-- Create security definer function to safely get user profile roles without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_profile_roles(_user_id uuid)
RETURNS TABLE(role text, primary_role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role, p.primary_role 
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;
$$;

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can update own profile (non-role fields)" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile data" ON public.profiles;

-- Create fixed policy that allows users to update their own profile
-- but prevents changing role/primary_role fields (uses security definer function)
CREATE POLICY "Users can update own profile non-role fields"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role IS NOT DISTINCT FROM (SELECT r.role FROM public.get_user_profile_roles(auth.uid()) r)
  AND primary_role IS NOT DISTINCT FROM (SELECT r.primary_role FROM public.get_user_profile_roles(auth.uid()) r)
);