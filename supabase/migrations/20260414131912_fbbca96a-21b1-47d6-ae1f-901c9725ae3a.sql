
-- Fix get_conversations: join on p.id instead of p.user_id, and fix assigned filter
CREATE OR REPLACE FUNCTION public.get_conversations(p_inbox_id uuid DEFAULT NULL::uuid, p_status_filter text DEFAULT 'all'::text, p_search_query text DEFAULT NULL::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 50)
 RETURNS TABLE(id uuid, subject text, preview_text text, status text, priority text, channel text, is_read boolean, is_archived boolean, created_at timestamp with time zone, updated_at timestamp with time zone, received_at timestamp with time zone, customer_id uuid, customer_name text, customer_email text, assigned_to_id uuid, assigned_to_name text, inbox_id uuid, inbox_name text, first_response_at timestamp with time zone, sla_breach_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_profile_id uuid;
  v_offset integer;
BEGIN
  v_org_id := get_user_organization_id();
  v_offset := (p_page - 1) * p_page_size;
  
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Get profile id for assigned filter
  SELECT p.id INTO v_profile_id
  FROM profiles p
  WHERE p.user_id = auth.uid();
  
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
  LEFT JOIN profiles p ON c.assigned_to_id = p.id
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
      OR (p_status_filter = 'assigned' AND c.assigned_to_id = v_profile_id)
    )
    AND (
      p_search_query IS NULL 
      OR p_search_query = ''
      OR c.subject ILIKE '%' || p_search_query || '%'
      OR c.preview_text ILIKE '%' || p_search_query || '%'
      OR cust.full_name ILIKE '%' || p_search_query || '%'
      OR cust.email ILIKE '%' || p_search_query || '%'
    )
  ORDER BY c.received_at DESC NULLS LAST
  LIMIT p_page_size
  OFFSET v_offset;
END;
$function$;

-- Fix get_conversations_with_session_recovery (1-arg version): join on p.id
CREATE OR REPLACE FUNCTION public.get_conversations_with_session_recovery(inbox_uuid uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, subject text, status text, priority text, is_read boolean, is_archived boolean, channel text, updated_at timestamp with time zone, received_at timestamp with time zone, inbox_id uuid, customer jsonb, assigned_to jsonb, snooze_until timestamp with time zone, session_uid uuid, organization_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  current_uid uuid;
  user_org_id uuid;
BEGIN
  current_uid := auth.uid();
  
  SELECT p.organization_id INTO user_org_id
  FROM public.profiles p 
  WHERE p.user_id = current_uid;
  
  RAISE LOG 'Session Debug - auth.uid(): %, user_org_id: %, inbox_uuid: %', 
    current_uid, user_org_id, inbox_uuid;
  
  IF current_uid IS NULL OR user_org_id IS NULL THEN
    RAISE LOG 'Session Recovery - Invalid session detected, returning empty';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
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
    c.snooze_until,
    current_uid as session_uid,
    c.organization_id
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.id
  WHERE c.organization_id = user_org_id
    AND (inbox_uuid IS NULL OR c.inbox_id = inbox_uuid)
  ORDER BY COALESCE(c.received_at, c.updated_at) DESC;
END;
$function$;

-- Fix get_conversations_with_session_recovery (2-arg version): join on p.id
CREATE OR REPLACE FUNCTION public.get_conversations_with_session_recovery(inbox_uuid uuid DEFAULT NULL::uuid, include_deleted boolean DEFAULT false)
 RETURNS TABLE(id uuid, subject text, status text, priority text, is_read boolean, is_archived boolean, is_deleted boolean, channel text, updated_at timestamp with time zone, received_at timestamp with time zone, inbox_id uuid, customer jsonb, assigned_to jsonb, snooze_until timestamp with time zone, session_uid uuid, organization_id uuid, preview_text text, first_response_at timestamp with time zone, sla_breach_at timestamp with time zone, metadata jsonb, last_message_is_internal boolean, last_message_sender_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  current_uid uuid;
  user_org_id uuid;
BEGIN
  current_uid := auth.uid();
  
  SELECT p.organization_id INTO user_org_id
  FROM public.profiles p
  WHERE p.user_id = current_uid;
  
  IF user_org_id IS NULL THEN
    SELECT om.organization_id INTO user_org_id
    FROM public.organization_memberships om
    WHERE om.user_id = current_uid
    AND om.status = 'active'
    LIMIT 1;
  END IF;
  
  IF user_org_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    c.id,
    c.subject,
    c.status,
    c.priority,
    c.is_read,
    c.is_archived,
    (c.deleted_at IS NOT NULL) as is_deleted,
    c.channel::TEXT,
    c.updated_at,
    c.received_at,
    c.inbox_id,
    CASE 
      WHEN cu.id IS NOT NULL THEN jsonb_build_object(
        'id', cu.id,
        'full_name', cu.full_name,
        'email', cu.email
      )
      ELSE NULL
    END as customer,
    CASE 
      WHEN p.id IS NOT NULL THEN jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url
      )
      ELSE NULL
    END as assigned_to,
    c.snooze_until,
    current_uid as session_uid,
    c.organization_id,
    c.preview_text,
    c.first_response_at,
    c.sla_breach_at,
    c.metadata,
    COALESCE(c.last_message_is_internal, false) as last_message_is_internal,
    COALESCE(c.last_message_sender_type, 'agent') as last_message_sender_type
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.id
  WHERE c.organization_id = user_org_id
    AND (inbox_uuid IS NULL OR c.inbox_id = inbox_uuid)
    AND (
      (include_deleted = true AND c.deleted_at IS NOT NULL)
      OR (include_deleted = false AND c.deleted_at IS NULL)
    )
  ORDER BY COALESCE(c.received_at, c.updated_at) DESC;
END;
$function$;
