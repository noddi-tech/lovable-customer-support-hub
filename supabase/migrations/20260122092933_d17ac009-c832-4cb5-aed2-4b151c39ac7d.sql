-- Fix webhook_event_mappings RLS policy - restrict to admins only
-- Current policy allows any authenticated user to read sensitive integration config

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view webhook mappings" ON public.webhook_event_mappings;

-- Create admin-only read policy
CREATE POLICY "Admins can view webhook mappings"
ON public.webhook_event_mappings
FOR SELECT
USING (has_permission(auth.uid(), 'manage_settings'));