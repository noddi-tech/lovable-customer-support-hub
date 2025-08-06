-- Drop and recreate the get_conversations function to include is_archived field
DROP FUNCTION public.get_conversations();

CREATE OR REPLACE FUNCTION public.get_conversations()
 RETURNS TABLE(
   id uuid, 
   subject text, 
   status text, 
   priority text, 
   is_read boolean, 
   is_archived boolean,
   channel text, 
   updated_at timestamp with time zone, 
   customer jsonb, 
   assigned_to jsonb
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT 
    c.id,
    c.subject,
    c.status,
    c.priority,
    c.is_read,
    c.is_archived,
    c.channel::TEXT,
    c.updated_at,
    CASE 
      WHEN cu.id IS NOT NULL 
      THEN jsonb_build_object('id', cu.id, 'full_name', cu.full_name, 'email', cu.email)
      ELSE NULL 
    END as customer,
    CASE 
      WHEN p.id IS NOT NULL 
      THEN jsonb_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url)
      ELSE NULL 
    END as assigned_to
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.user_id
  WHERE c.organization_id = public.get_user_organization_id()
  ORDER BY c.updated_at DESC;
$function$