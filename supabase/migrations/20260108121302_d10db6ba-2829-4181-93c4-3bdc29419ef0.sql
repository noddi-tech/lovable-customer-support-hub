-- Fix RLS policies to use user_roles table instead of profiles.role
-- This fixes the issue where agents with correct roles in user_roles table
-- cannot access messages because profiles.role has incorrect value

-- Create helper function to check if user has any of the specified roles
-- Using SECURITY DEFINER to avoid RLS recursion issues
CREATE OR REPLACE FUNCTION public.user_has_any_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = ANY(_roles)
  )
$$;

-- Drop the broken policies
DROP POLICY IF EXISTS "Agents can view all messages including internal notes" ON public.messages;
DROP POLICY IF EXISTS "Agents can insert all message types" ON public.messages;
DROP POLICY IF EXISTS "Agents can update their own messages" ON public.messages;

-- Recreate policies using user_roles table via the helper function
CREATE POLICY "Agents can view all messages including internal notes"
ON public.messages
FOR SELECT
USING (
  public.user_has_any_role(auth.uid(), ARRAY['agent', 'admin', 'super_admin'])
);

CREATE POLICY "Agents can insert all message types"
ON public.messages
FOR INSERT
WITH CHECK (
  public.user_has_any_role(auth.uid(), ARRAY['agent', 'admin', 'super_admin'])
);

CREATE POLICY "Agents can update their own messages"
ON public.messages
FOR UPDATE
USING (
  sender_id = auth.uid()
  AND public.user_has_any_role(auth.uid(), ARRAY['agent', 'admin', 'super_admin'])
);