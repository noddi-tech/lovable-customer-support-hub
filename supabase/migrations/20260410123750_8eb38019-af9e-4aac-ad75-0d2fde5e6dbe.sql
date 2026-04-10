
-- 1. Add column
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS last_message_sender_type text DEFAULT 'agent';

-- 2. Backfill from most recent message per conversation
UPDATE conversations c SET last_message_sender_type = sub.sender_type
FROM (
  SELECT DISTINCT ON (conversation_id) conversation_id, sender_type
  FROM messages
  ORDER BY conversation_id, created_at DESC
) sub
WHERE c.id = sub.conversation_id;

-- 3. Update the trigger function to also set last_message_sender_type
CREATE OR REPLACE FUNCTION public.update_conversation_preview()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  preview text;
BEGIN
  -- Strip HTML and truncate for preview
  preview := left(regexp_replace(NEW.content, '<[^>]+>', '', 'g'), 200);
  
  UPDATE conversations
  SET 
    preview_text = preview,
    updated_at = NEW.created_at,
    last_message_is_internal = COALESCE(NEW.is_internal, false),
    last_message_sender_type = NEW.sender_type
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

-- 4. Recreate the optimized listing function with the new column
CREATE OR REPLACE FUNCTION public.list_conversations_optimized(
  p_organization_id uuid,
  p_status text DEFAULT 'open',
  p_inbox_id uuid DEFAULT NULL,
  p_assigned_to_id uuid DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_is_archived boolean DEFAULT false,
  p_is_deleted boolean DEFAULT false,
  p_search_query text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
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
  created_at timestamptz,
  updated_at timestamptz,
  inbox_id uuid,
  customer_id uuid,
  customer_name text,
  customer_email text,
  assigned_to_id uuid,
  assigned_to_name text,
  assigned_to_avatar text,
  snooze_until timestamptz,
  sla_breach_at timestamptz,
  first_response_at timestamptz,
  last_message_is_internal boolean,
  last_message_sender_type text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
BEGIN
  -- Get count first
  SELECT count(*) INTO v_total
  FROM conversations c
  WHERE c.organization_id = p_organization_id
    AND c.status = COALESCE(p_status, c.status)
    AND (p_inbox_id IS NULL OR c.inbox_id = p_inbox_id)
    AND (p_assigned_to_id IS NULL OR c.assigned_to_id = p_assigned_to_id)
    AND (p_priority IS NULL OR c.priority = p_priority)
    AND (p_channel IS NULL OR c.channel::text = p_channel)
    AND COALESCE(c.is_archived, false) = p_is_archived
    AND (p_is_deleted = false AND c.deleted_at IS NULL OR p_is_deleted = true AND c.deleted_at IS NOT NULL)
    AND (p_search_query IS NULL OR c.subject ILIKE '%' || p_search_query || '%' OR c.preview_text ILIKE '%' || p_search_query || '%');

  RETURN QUERY
  SELECT
    c.id,
    c.subject,
    c.preview_text,
    c.status,
    c.priority,
    c.channel::text,
    COALESCE(c.is_read, false),
    COALESCE(c.is_archived, false),
    c.created_at,
    c.updated_at,
    c.inbox_id,
    c.customer_id,
    cust.full_name,
    cust.email,
    c.assigned_to_id,
    p.full_name,
    p.avatar_url,
    c.snooze_until,
    c.sla_breach_at,
    c.first_response_at,
    COALESCE(c.last_message_is_internal, false),
    COALESCE(c.last_message_sender_type, 'agent'),
    v_total
  FROM conversations c
  LEFT JOIN customers cust ON cust.id = c.customer_id
  LEFT JOIN profiles p ON p.id = c.assigned_to_id
  WHERE c.organization_id = p_organization_id
    AND c.status = COALESCE(p_status, c.status)
    AND (p_inbox_id IS NULL OR c.inbox_id = p_inbox_id)
    AND (p_assigned_to_id IS NULL OR c.assigned_to_id = p_assigned_to_id)
    AND (p_priority IS NULL OR c.priority = p_priority)
    AND (p_channel IS NULL OR c.channel::text = p_channel)
    AND COALESCE(c.is_archived, false) = p_is_archived
    AND (p_is_deleted = false AND c.deleted_at IS NULL OR p_is_deleted = true AND c.deleted_at IS NOT NULL)
    AND (p_search_query IS NULL OR c.subject ILIKE '%' || p_search_query || '%' OR c.preview_text ILIKE '%' || p_search_query || '%')
  ORDER BY c.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
