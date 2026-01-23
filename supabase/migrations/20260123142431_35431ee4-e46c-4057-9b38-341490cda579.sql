-- Update get_conversations_with_session_recovery to handle deleted conversations
CREATE OR REPLACE FUNCTION public.get_conversations_with_session_recovery(
  inbox_uuid uuid DEFAULT NULL,
  include_deleted boolean DEFAULT false
)
RETURNS TABLE(
  id uuid, 
  subject text, 
  status text, 
  priority text, 
  is_read boolean, 
  is_archived boolean,
  is_deleted boolean,
  channel text, 
  updated_at timestamp with time zone, 
  received_at timestamp with time zone, 
  inbox_id uuid, 
  customer jsonb, 
  assigned_to jsonb, 
  snooze_until timestamp with time zone,
  session_uid uuid,
  organization_id uuid,
  preview_text text,
  first_response_at timestamp with time zone,
  sla_breach_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_uid uuid;
  user_org_id uuid;
BEGIN
  -- Get current user ID with recovery from JWT
  current_uid := auth.uid();
  
  -- Try to get organization from profile
  SELECT p.organization_id INTO user_org_id
  FROM public.profiles p
  WHERE p.user_id = current_uid;
  
  -- If no org found, try from org memberships
  IF user_org_id IS NULL THEN
    SELECT om.organization_id INTO user_org_id
    FROM public.organization_memberships om
    WHERE om.user_id = current_uid
    AND om.status = 'active'
    LIMIT 1;
  END IF;
  
  -- Return empty if no organization found
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
      WHEN p.user_id IS NOT NULL THEN jsonb_build_object(
        'id', p.user_id,
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
    c.sla_breach_at
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.user_id
  WHERE c.organization_id = user_org_id
    AND (inbox_uuid IS NULL OR c.inbox_id = inbox_uuid)
    -- Filter by deleted status based on parameter
    AND (
      (include_deleted = true AND c.deleted_at IS NOT NULL)
      OR (include_deleted = false AND c.deleted_at IS NULL)
    )
  ORDER BY COALESCE(c.received_at, c.updated_at) DESC;
END;
$function$;