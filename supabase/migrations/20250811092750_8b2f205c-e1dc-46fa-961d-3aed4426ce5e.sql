-- Update get_conversations to include inbox_id so the UI can filter by inbox
CREATE OR REPLACE FUNCTION public.get_conversations()
RETURNS TABLE(
  id uuid,
  subject text,
  status text,
  priority text,
  is_read boolean,
  is_archived boolean,
  channel text,
  updated_at timestamptz,
  received_at timestamptz,
  inbox_id uuid,
  customer jsonb,
  assigned_to jsonb,
  snooze_until timestamptz
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
    c.received_at,
    c.inbox_id,
    CASE 
      WHEN cu.id IS NOT NULL 
      THEN jsonb_build_object('id', cu.id, 'full_name', cu.full_name, 'email', cu.email)
      ELSE NULL 
    END as customer,
    CASE 
      WHEN p.id IS NOT NULL 
      THEN jsonb_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url)
      ELSE NULL 
    END as assigned_to,
    c.snooze_until
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.user_id
  WHERE c.organization_id = public.get_user_organization_id()
  ORDER BY COALESCE(c.received_at, c.updated_at) DESC;
$function$;