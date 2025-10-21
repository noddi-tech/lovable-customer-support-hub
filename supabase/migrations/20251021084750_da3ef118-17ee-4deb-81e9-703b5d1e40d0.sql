-- Update get_conversations to include missing fields: email_account, preview_text, first_response_at, sla_breach_at
DROP FUNCTION IF EXISTS public.get_conversations();

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
  email_account jsonb,
  snooze_until timestamptz,
  preview_text text,
  first_response_at timestamptz,
  sla_breach_at timestamptz,
  sla_status text
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
    CASE 
      WHEN ea.id IS NOT NULL 
      THEN jsonb_build_object('id', ea.id, 'email_address', ea.email_address)
      ELSE NULL 
    END as email_account,
    c.snooze_until,
    -- Get preview text from first message (first 150 characters of content)
    (
      SELECT LEFT(COALESCE(m.content, ''), 150)
      FROM public.messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.created_at ASC
      LIMIT 1
    ) as preview_text,
    c.first_response_at,
    c.sla_breach_at,
    public.get_sla_status(c.first_response_at, c.sla_breach_at, c.status) as sla_status
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.user_id
  LEFT JOIN public.email_accounts ea ON c.email_account_id = ea.id
  WHERE c.organization_id = public.get_user_organization_id()
  ORDER BY COALESCE(c.received_at, c.updated_at) DESC;
$function$;