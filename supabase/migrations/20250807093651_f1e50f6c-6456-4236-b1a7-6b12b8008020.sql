-- Fix privilege escalation vulnerability in profiles table
-- Remove the existing update policy that allows users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create separate policies for different fields
-- Policy for non-sensitive profile fields
CREATE POLICY "Users can update their own profile data" ON public.profiles
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND
  -- Prevent updating role fields
  role = OLD.role AND
  primary_role = OLD.primary_role
);

-- Policy for admin-only role management
CREATE POLICY "Admins can manage user roles" ON public.profiles
FOR UPDATE
USING (has_permission(auth.uid(), 'manage_users'::app_permission))
WITH CHECK (has_permission(auth.uid(), 'manage_users'::app_permission));

-- Enable RLS on debug_logs table
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

-- Create admin-only policy for debug_logs
CREATE POLICY "Only admins can view debug logs" ON public.debug_logs
FOR SELECT
USING (has_permission(auth.uid(), 'manage_users'::app_permission));

CREATE POLICY "Only admins can insert debug logs" ON public.debug_logs
FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'manage_users'::app_permission));

-- Fix database functions to include proper search_path protection
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_user_organization_from_profile(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id;
$function$;