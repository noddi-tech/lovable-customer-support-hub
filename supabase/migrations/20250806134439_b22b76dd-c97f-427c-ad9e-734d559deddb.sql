-- Add DELETE policy for conversations table
CREATE POLICY "Users can delete conversations in their organization" 
ON public.conversations 
FOR DELETE 
USING (organization_id = get_user_organization_id());