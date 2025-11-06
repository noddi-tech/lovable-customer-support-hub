-- Migration: Fix privilege escalation vulnerability in profiles table
-- Issue: Users could modify their own primary_role and role fields, enabling privilege escalation
-- Fix: Drop insecure policy and create new policy that prevents role field modifications

-- Drop the insecure policy that allows role field modifications
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create secure policy that prevents role field changes
CREATE POLICY "Users can update own profile (non-role fields)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- CRITICAL: Prevent role escalation by ensuring role fields cannot be changed
  -- Uses IS NOT DISTINCT FROM to handle NULL values correctly
  primary_role IS NOT DISTINCT FROM (SELECT primary_role FROM public.profiles WHERE user_id = auth.uid()) AND
  role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE user_id = auth.uid())
);

-- Add comment for documentation
COMMENT ON POLICY "Users can update own profile (non-role fields)" ON public.profiles IS 
'Allows users to update their own profile data but prevents modification of role fields to prevent privilege escalation attacks. Role management is handled exclusively through the user_roles table with proper authorization.';