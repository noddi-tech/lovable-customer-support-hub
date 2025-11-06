-- Fix get_conversations to properly handle archived status filtering
CREATE OR REPLACE FUNCTION public.get_conversations(
  inbox_filter uuid DEFAULT NULL,
  status_filter text DEFAULT NULL,
  page_limit integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  subject text,
  status text,
  priority text,
  is_read boolean,
  is_archived boolean,
  channel text,
  updated_at timestamp with time zone,
  received_at timestamp with time zone,
  inbox_id uuid,
  customer jsonb,
  assigned_to jsonb,
  email_account jsonb,
  snooze_until timestamp with time zone,
  preview_text text,
  first_response_at timestamp with time zone,
  sla_breach_at timestamp with time zone,
  sla_status text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  total_rows bigint;
BEGIN
  -- Get total count for pagination UI
  SELECT COUNT(*) INTO total_rows
  FROM public.conversations c
  WHERE c.organization_id = public.get_user_organization_id()
    AND (inbox_filter IS NULL OR c.inbox_id = inbox_filter)
    AND (
      status_filter IS NULL 
      OR (status_filter = 'archived' AND c.is_archived = true)
      OR (status_filter != 'archived' AND c.status = status_filter)
    );
  
  -- Return paginated results with total count
  RETURN QUERY
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
    c.preview_text,
    c.first_response_at,
    c.sla_breach_at,
    public.get_sla_status(c.first_response_at, c.sla_breach_at, c.status) as sla_status,
    total_rows as total_count
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.user_id
  LEFT JOIN public.email_accounts ea ON c.email_account_id = ea.id
  WHERE c.organization_id = public.get_user_organization_id()
    AND (inbox_filter IS NULL OR c.inbox_id = inbox_filter)
    AND (
      status_filter IS NULL 
      OR (status_filter = 'archived' AND c.is_archived = true)
      OR (status_filter != 'archived' AND c.status = status_filter)
    )
  ORDER BY COALESCE(c.received_at, c.updated_at) DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;