-- Emergency session recovery: Create admin function to get conversations bypassing RLS
CREATE OR REPLACE FUNCTION public.get_conversations_with_session_recovery(inbox_uuid uuid DEFAULT NULL)
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
   snooze_until timestamp with time zone,
   session_uid uuid,
   organization_id uuid
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  current_uid uuid;
  user_org_id uuid;
BEGIN
  -- Get current auth uid and log it
  current_uid := auth.uid();
  
  -- Get user organization
  SELECT p.organization_id INTO user_org_id
  FROM public.profiles p 
  WHERE p.user_id = current_uid;
  
  -- Log session state for debugging
  RAISE LOG 'Session Debug - auth.uid(): %, user_org_id: %, inbox_uuid: %', 
    current_uid, user_org_id, inbox_uuid;
  
  -- If no valid session, return empty (don't bypass security completely)
  IF current_uid IS NULL OR user_org_id IS NULL THEN
    RAISE LOG 'Session Recovery - Invalid session detected, returning empty';
    RETURN;
  END IF;
  
  -- Return conversations with session debugging info
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
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.user_id
  WHERE c.organization_id = user_org_id
    AND (inbox_uuid IS NULL OR c.inbox_id = inbox_uuid)
  ORDER BY COALESCE(c.received_at, c.updated_at) DESC;
END;
$function$;