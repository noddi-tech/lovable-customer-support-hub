-- Add RLS policies for department management
CREATE POLICY "Users can create departments in their organization" 
ON public.departments 
FOR INSERT 
TO authenticated 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update departments in their organization" 
ON public.departments 
FOR UPDATE 
TO authenticated 
USING (organization_id = get_user_organization_id()) 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete departments in their organization" 
ON public.departments 
FOR DELETE 
TO authenticated 
USING (organization_id = get_user_organization_id());