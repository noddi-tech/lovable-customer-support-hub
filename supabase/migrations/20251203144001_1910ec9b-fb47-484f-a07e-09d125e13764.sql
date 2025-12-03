-- Drop existing functions first (required when changing return type)
DROP FUNCTION IF EXISTS get_all_counts();
DROP FUNCTION IF EXISTS get_inbox_counts(uuid);

-- Recreate get_all_counts with conversations_open
CREATE OR REPLACE FUNCTION get_all_counts()
RETURNS TABLE (
  conversations_all bigint,
  conversations_open bigint,
  conversations_unread bigint,
  conversations_assigned bigint,
  conversations_pending bigint,
  conversations_closed bigint,
  conversations_archived bigint,
  channels_email bigint,
  channels_facebook bigint,
  channels_instagram bigint,
  channels_whatsapp bigint,
  notifications_unread bigint,
  inboxes_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  v_org_id := get_user_organization_id();
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT 
      0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
      0::bigint, 0::bigint, 0::bigint, 0::bigint,
      0::bigint,
      '[]'::jsonb;
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH conv_counts AS (
    SELECT
      COUNT(*)::bigint as total,
      COUNT(*) FILTER (WHERE status = 'open')::bigint as open_count,
      COUNT(*) FILTER (WHERE is_read = false)::bigint as unread_count,
      COUNT(*) FILTER (WHERE assigned_to_id = v_user_id)::bigint as assigned_count,
      COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_count,
      COUNT(*) FILTER (WHERE status = 'closed')::bigint as closed_count,
      COUNT(*) FILTER (WHERE is_archived = true)::bigint as archived_count,
      COUNT(*) FILTER (WHERE channel = 'email')::bigint as email_count,
      COUNT(*) FILTER (WHERE channel = 'facebook')::bigint as facebook_count,
      COUNT(*) FILTER (WHERE channel = 'instagram')::bigint as instagram_count,
      COUNT(*) FILTER (WHERE channel = 'whatsapp')::bigint as whatsapp_count
    FROM conversations
    WHERE organization_id = v_org_id
      AND is_archived = false
  ),
  notif_counts AS (
    SELECT COUNT(*)::bigint as unread_notifs
    FROM notifications
    WHERE user_id = v_user_id AND is_read = false
  ),
  inbox_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'name', i.name,
        'color', COALESCE(i.color, '#3B82F6'),
        'conversation_count', COALESCE(conv_count.cnt, 0),
        'is_active', i.is_active
      )
    ) as data
    FROM inboxes i
    LEFT JOIN (
      SELECT inbox_id, COUNT(*)::int as cnt
      FROM conversations
      WHERE organization_id = v_org_id AND is_archived = false
      GROUP BY inbox_id
    ) conv_count ON conv_count.inbox_id = i.id
    WHERE i.organization_id = v_org_id
  )
  SELECT
    cc.total,
    cc.open_count,
    cc.unread_count,
    cc.assigned_count,
    cc.pending_count,
    cc.closed_count,
    cc.archived_count,
    cc.email_count,
    cc.facebook_count,
    cc.instagram_count,
    cc.whatsapp_count,
    nc.unread_notifs,
    COALESCE(id.data, '[]'::jsonb)
  FROM conv_counts cc
  CROSS JOIN notif_counts nc
  CROSS JOIN inbox_data id;
END;
$$;

-- Recreate get_inbox_counts with conversations_open
CREATE OR REPLACE FUNCTION get_inbox_counts(inbox_uuid uuid)
RETURNS TABLE (
  conversations_all bigint,
  conversations_open bigint,
  conversations_unread bigint,
  conversations_assigned bigint,
  conversations_pending bigint,
  conversations_closed bigint,
  conversations_archived bigint,
  channels_email bigint,
  channels_facebook bigint,
  channels_instagram bigint,
  channels_whatsapp bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  v_org_id := get_user_organization_id();
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT 
      0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
      0::bigint, 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total,
    COUNT(*) FILTER (WHERE status = 'open')::bigint as open_count,
    COUNT(*) FILTER (WHERE is_read = false)::bigint as unread_count,
    COUNT(*) FILTER (WHERE assigned_to_id = v_user_id)::bigint as assigned_count,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_count,
    COUNT(*) FILTER (WHERE status = 'closed')::bigint as closed_count,
    COUNT(*) FILTER (WHERE is_archived = true)::bigint as archived_count,
    COUNT(*) FILTER (WHERE channel = 'email')::bigint as email_count,
    COUNT(*) FILTER (WHERE channel = 'facebook')::bigint as facebook_count,
    COUNT(*) FILTER (WHERE channel = 'instagram')::bigint as instagram_count,
    COUNT(*) FILTER (WHERE channel = 'whatsapp')::bigint as whatsapp_count
  FROM conversations
  WHERE organization_id = v_org_id
    AND inbox_id = inbox_uuid
    AND is_archived = false;
END;
$$;

-- Update get_conversations to properly handle 'open' status filter
CREATE OR REPLACE FUNCTION get_conversations(
  p_inbox_id uuid DEFAULT NULL,
  p_status_filter text DEFAULT 'all',
  p_search_query text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE (
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
  customer_id uuid,
  customer_name text,
  customer_email text,
  assigned_to_id uuid,
  assigned_to_name text,
  inbox_id uuid,
  inbox_name text,
  first_response_at timestamptz,
  sla_breach_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;