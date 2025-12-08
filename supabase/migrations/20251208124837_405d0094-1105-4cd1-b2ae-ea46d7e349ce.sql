-- Drop and recreate get_conversations with received_at in return type
DROP FUNCTION IF EXISTS public.get_conversations(uuid, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_conversations(
  p_inbox_id uuid DEFAULT NULL::uuid, 
  p_status_filter text DEFAULT 'all'::text, 
  p_search_query text DEFAULT NULL::text, 
  p_page integer DEFAULT 1, 
  p_page_size integer DEFAULT 50
)
RETURNS TABLE(
  id uuid, 
  subject text, 
  preview_text text, 
  status text, 
  priority text, 
  channel text, 
  is_read boolean, 
  is_archived boolean, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone,
  received_at timestamp with time zone,
  customer_id uuid, 
  customer_name text, 
  customer_email text, 
  assigned_to_id uuid, 
  assigned_to_name text, 
  inbox_id uuid, 
  inbox_name text, 
  first_response_at timestamp with time zone, 
  sla_breach_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_offset integer;
BEGIN
  v_org_id := get_user_organization_id();
  v_offset := (p_page - 1) * p_page_size;
  
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    c.id,
    c.subject,
    c.preview_text,
    c.status,
    c.priority,
    c.channel::text,
    c.is_read,
    c.is_archived,
    c.created_at,
    c.updated_at,
    c.received_at,
    c.customer_id,
    cust.full_name as customer_name,
    cust.email as customer_email,
    c.assigned_to_id,
    p.full_name as assigned_to_name,
    c.inbox_id,
    i.name as inbox_name,
    c.first_response_at,
    c.sla_breach_at
  FROM conversations c
  LEFT JOIN customers cust ON c.customer_id = cust.id
  LEFT JOIN profiles p ON c.assigned_to_id = p.user_id
  LEFT JOIN inboxes i ON c.inbox_id = i.id
  WHERE c.organization_id = v_org_id
    AND (p_inbox_id IS NULL OR c.inbox_id = p_inbox_id)
    AND (
      p_status_filter = 'all'
      OR (p_status_filter = 'open' AND c.status = 'open')
      OR (p_status_filter = 'pending' AND c.status = 'pending')
      OR (p_status_filter = 'closed' AND c.status = 'closed')
      OR (p_status_filter = 'archived' AND c.is_archived = true)
      OR (p_status_filter = 'unread' AND c.is_read = false)
      OR (p_status_filter = 'assigned' AND c.assigned_to_id = auth.uid())
    )
    AND (p_status_filter = 'archived' OR c.is_archived = false)
    AND (
      p_search_query IS NULL 
      OR p_search_query = ''
      OR c.subject ILIKE '%' || p_search_query || '%'
      OR c.preview_text ILIKE '%' || p_search_query || '%'
      OR cust.full_name ILIKE '%' || p_search_query || '%'
      OR cust.email ILIKE '%' || p_search_query || '%'
    )
  ORDER BY c.updated_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$function$;