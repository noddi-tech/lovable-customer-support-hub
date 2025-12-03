-- Add deleted_at column for soft delete functionality
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient filtering of deleted conversations
CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at ON public.conversations (deleted_at) WHERE deleted_at IS NOT NULL;

-- Drop existing functions to allow return type change
DROP FUNCTION IF EXISTS public.get_all_counts();
DROP FUNCTION IF EXISTS public.get_inbox_counts(uuid);

-- Recreate get_all_counts with deleted count
CREATE FUNCTION public.get_all_counts()
 RETURNS TABLE(conversations_all bigint, conversations_open bigint, conversations_unread bigint, conversations_assigned bigint, conversations_pending bigint, conversations_closed bigint, conversations_archived bigint, conversations_deleted bigint, channels_email bigint, channels_facebook bigint, channels_instagram bigint, channels_whatsapp bigint, notifications_unread bigint, inboxes_data jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  v_org_id := get_user_organization_id();
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT 
      0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
      0::bigint, 0::bigint, 0::bigint, 0::bigint,
      0::bigint,
      '[]'::jsonb;
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH conv_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE deleted_at IS NULL)::bigint as total,
      COUNT(*) FILTER (WHERE status = 'open' AND deleted_at IS NULL)::bigint as open_count,
      COUNT(*) FILTER (WHERE is_read = false AND deleted_at IS NULL)::bigint as unread_count,
      COUNT(*) FILTER (WHERE assigned_to_id = v_user_id AND deleted_at IS NULL)::bigint as assigned_count,
      COUNT(*) FILTER (WHERE status = 'pending' AND deleted_at IS NULL)::bigint as pending_count,
      COUNT(*) FILTER (WHERE status = 'closed' AND deleted_at IS NULL)::bigint as closed_count,
      COUNT(*) FILTER (WHERE is_archived = true AND deleted_at IS NULL)::bigint as archived_count,
      COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::bigint as deleted_count,
      COUNT(*) FILTER (WHERE channel = 'email' AND deleted_at IS NULL)::bigint as email_count,
      COUNT(*) FILTER (WHERE channel = 'facebook' AND deleted_at IS NULL)::bigint as facebook_count,
      COUNT(*) FILTER (WHERE channel = 'instagram' AND deleted_at IS NULL)::bigint as instagram_count,
      COUNT(*) FILTER (WHERE channel = 'whatsapp' AND deleted_at IS NULL)::bigint as whatsapp_count
    FROM conversations
    WHERE organization_id = v_org_id
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
      WHERE organization_id = v_org_id AND is_archived = false AND deleted_at IS NULL
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
    cc.deleted_count,
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
$function$;

-- Recreate get_inbox_counts with deleted count
CREATE FUNCTION public.get_inbox_counts(inbox_uuid uuid)
 RETURNS TABLE(conversations_all bigint, conversations_open bigint, conversations_unread bigint, conversations_assigned bigint, conversations_pending bigint, conversations_closed bigint, conversations_archived bigint, conversations_deleted bigint, channels_email bigint, channels_facebook bigint, channels_instagram bigint, channels_whatsapp bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  v_org_id := get_user_organization_id();
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT 
      0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
      0::bigint, 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL)::bigint as total,
    COUNT(*) FILTER (WHERE status = 'open' AND deleted_at IS NULL)::bigint as open_count,
    COUNT(*) FILTER (WHERE is_read = false AND deleted_at IS NULL)::bigint as unread_count,
    COUNT(*) FILTER (WHERE assigned_to_id = v_user_id AND deleted_at IS NULL)::bigint as assigned_count,
    COUNT(*) FILTER (WHERE status = 'pending' AND deleted_at IS NULL)::bigint as pending_count,
    COUNT(*) FILTER (WHERE status = 'closed' AND deleted_at IS NULL)::bigint as closed_count,
    COUNT(*) FILTER (WHERE is_archived = true AND deleted_at IS NULL)::bigint as archived_count,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::bigint as deleted_count,
    COUNT(*) FILTER (WHERE channel = 'email' AND deleted_at IS NULL)::bigint as email_count,
    COUNT(*) FILTER (WHERE channel = 'facebook' AND deleted_at IS NULL)::bigint as facebook_count,
    COUNT(*) FILTER (WHERE channel = 'instagram' AND deleted_at IS NULL)::bigint as instagram_count,
    COUNT(*) FILTER (WHERE channel = 'whatsapp' AND deleted_at IS NULL)::bigint as whatsapp_count
  FROM conversations
  WHERE organization_id = v_org_id
    AND inbox_id = inbox_uuid;
END;
$function$;