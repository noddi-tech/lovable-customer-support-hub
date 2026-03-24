
-- Add last_message_is_internal column
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS last_message_is_internal boolean DEFAULT false;

-- Update trigger to track last_message_is_internal
CREATE OR REPLACE FUNCTION public.update_conversation_preview()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Always update last_message_is_internal on INSERT
  IF TG_OP = 'INSERT' THEN
    UPDATE public.conversations 
    SET last_message_is_internal = COALESCE(NEW.is_internal, false),
        preview_text = CASE 
          WHEN NOT COALESCE(NEW.is_internal, false) THEN LEFT(public.strip_html_tags(NEW.content), 150)
          ELSE preview_text
        END
    WHERE id = NEW.conversation_id;
  END IF;
  
  -- On UPDATE: Only update preview if it's the first non-internal message
  IF TG_OP = 'UPDATE' AND NOT COALESCE(NEW.is_internal, false) THEN
    UPDATE public.conversations c
    SET preview_text = LEFT(public.strip_html_tags(NEW.content), 150),
        last_message_is_internal = false
    WHERE c.id = NEW.conversation_id
    AND (
      SELECT m.id FROM public.messages m 
      WHERE m.conversation_id = c.id 
      AND NOT COALESCE(m.is_internal, false)
      ORDER BY m.created_at ASC 
      LIMIT 1
    ) = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update RPC to return the new column
DROP FUNCTION IF EXISTS public.get_conversations_with_session_recovery(uuid, boolean);

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
  sla_breach_at timestamp with time zone,
  metadata jsonb,
  last_message_is_internal boolean
)
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
    c.sla_breach_at,
    c.metadata,
    COALESCE(c.last_message_is_internal, false) as last_message_is_internal
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.user_id
  WHERE c.organization_id = user_org_id
    AND (inbox_uuid IS NULL OR c.inbox_id = inbox_uuid)
    AND (
      (include_deleted = true AND c.deleted_at IS NOT NULL)
      OR (include_deleted = false AND c.deleted_at IS NULL)
    )
  ORDER BY COALESCE(c.received_at, c.updated_at) DESC;
END;
$function$;

-- Backfill: set last_message_is_internal based on the most recent message per conversation
UPDATE public.conversations c
SET last_message_is_internal = COALESCE((
  SELECT COALESCE(m.is_internal, false)
  FROM public.messages m
  WHERE m.conversation_id = c.id
  ORDER BY m.created_at DESC
  LIMIT 1
), false);
