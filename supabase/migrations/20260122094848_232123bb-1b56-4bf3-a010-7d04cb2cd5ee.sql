-- Fix widget_configs security: Replace public read policy with organization member policy
-- This is safe because:
-- 1. All public widget access goes through edge functions using service role (bypasses RLS)
-- 2. Admin UI queries are scoped to organization_id and use authenticated clients

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public can read active widget configs" ON public.widget_configs;

-- Create organization member policy for authenticated access
CREATE POLICY "Organization members can read widget configs"
ON public.widget_configs
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.organization_memberships 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);