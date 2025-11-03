-- Create helper function to get current user's profile ID from their auth.uid()
create or replace function public.get_user_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- Fix service_ticket_comments RLS policies
DROP POLICY IF EXISTS "Users can create comments on tickets in their organization" ON public.service_ticket_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.service_ticket_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.service_ticket_comments;

CREATE POLICY "Users can create comments on tickets in their organization" 
ON public.service_ticket_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.service_tickets st
    WHERE st.id = service_ticket_comments.ticket_id 
      AND st.organization_id = public.get_user_organization_id()
  )
  AND created_by_id = public.get_user_profile_id()
);

CREATE POLICY "Users can delete their own comments"
ON public.service_ticket_comments
FOR DELETE
USING (created_by_id = public.get_user_profile_id());

CREATE POLICY "Users can update their own comments"
ON public.service_ticket_comments
FOR UPDATE
USING (created_by_id = public.get_user_profile_id());

-- Fix service_ticket_attachments RLS policies
DROP POLICY IF EXISTS "Users can upload attachments to tickets in their organization" ON public.service_ticket_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.service_ticket_attachments;

CREATE POLICY "Users can upload attachments to tickets in their organization"
ON public.service_ticket_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.service_tickets st
    WHERE st.id = service_ticket_attachments.ticket_id 
      AND st.organization_id = public.get_user_organization_id()
  )
  AND uploaded_by_id = public.get_user_profile_id()
);

CREATE POLICY "Users can delete their own attachments"
ON public.service_ticket_attachments
FOR DELETE
USING (uploaded_by_id = public.get_user_profile_id());