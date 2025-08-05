-- Add RLS policy to allow users to update their organization
CREATE POLICY "Users can update their own organization" 
ON public.organizations 
FOR UPDATE 
USING (id = get_user_organization_id())
WITH CHECK (id = get_user_organization_id());