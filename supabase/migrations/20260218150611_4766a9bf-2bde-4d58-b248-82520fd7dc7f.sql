
-- Fix get_all_counts: rename SELECT aliases to match declared return columns
CREATE OR REPLACE FUNCTION public.get_all_counts()
 RETURNS TABLE(conversations_all bigint, conversations_open bigint, conversations_unread bigint, conversations_assigned bigint, conversations_pending bigint, conversations_closed bigint, conversations_archived bigint, conversations_deleted bigint, channels_email bigint, channels_facebook bigint, channels_instagram bigint, channels_whatsapp bigint, notifications_unread bigint, inboxes_data jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_profile_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  SELECT p.organization_id, p.id INTO v_org_id, v_profile_id
  FROM profiles p 
  WHERE p.user_id = v_user_id;
  
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
      COUNT(*) FILTER (WHERE deleted_at IS NULL)::bigint as conversations_all,
      COUNT(*) FILTER (WHERE status = 'open' AND deleted_at IS NULL)::bigint as conversations_open,
      COUNT(*) FILTER (WHERE is_read = false AND deleted_at IS NULL)::bigint as conversations_unread,
      COUNT(*) FILTER (WHERE assigned_to_id = v_profile_id AND deleted_at IS NULL)::bigint as conversations_assigned,
      COUNT(*) FILTER (WHERE status = 'pending' AND deleted_at IS NULL)::bigint as conversations_pending,
      COUNT(*) FILTER (WHERE status = 'closed' AND deleted_at IS NULL)::bigint as conversations_closed,
      COUNT(*) FILTER (WHERE is_archived = true AND deleted_at IS NULL)::bigint as conversations_archived,
      COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::bigint as conversations_deleted,
      COUNT(*) FILTER (WHERE channel = 'email' AND deleted_at IS NULL)::bigint as channels_email,
      COUNT(*) FILTER (WHERE channel = 'facebook' AND deleted_at IS NULL)::bigint as channels_facebook,
      COUNT(*) FILTER (WHERE channel = 'instagram' AND deleted_at IS NULL)::bigint as channels_instagram,
      COUNT(*) FILTER (WHERE channel = 'whatsapp' AND deleted_at IS NULL)::bigint as channels_whatsapp
    FROM conversations
    WHERE organization_id = v_org_id
  ),
  notif_counts AS (
    SELECT COUNT(*)::bigint as notifications_unread
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
    ) as inboxes_data
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
    cc.conversations_all,
    cc.conversations_open,
    cc.conversations_unread,
    cc.conversations_assigned,
    cc.conversations_pending,
    cc.conversations_closed,
    cc.conversations_archived,
    cc.conversations_deleted,
    cc.channels_email,
    cc.channels_facebook,
    cc.channels_instagram,
    cc.channels_whatsapp,
    nc.notifications_unread,
    COALESCE(id.inboxes_data, '[]'::jsonb)
  FROM conv_counts cc
  CROSS JOIN notif_counts nc
  CROSS JOIN inbox_data id;
END;
$function$;

-- Fix get_inbox_counts: rename SELECT aliases to match declared return columns
CREATE OR REPLACE FUNCTION public.get_inbox_counts(inbox_uuid uuid)
 RETURNS TABLE(conversations_all bigint, conversations_open bigint, conversations_unread bigint, conversations_assigned bigint, conversations_pending bigint, conversations_closed bigint, conversations_archived bigint, conversations_deleted bigint, channels_email bigint, channels_facebook bigint, channels_instagram bigint, channels_whatsapp bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_profile_id uuid;
BEGIN
  SELECT p.organization_id, p.id INTO v_org_id, v_profile_id
  FROM profiles p 
  WHERE p.user_id = auth.uid();
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT 
      0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
      0::bigint, 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL)::bigint as conversations_all,
    COUNT(*) FILTER (WHERE status = 'open' AND deleted_at IS NULL)::bigint as conversations_open,
    COUNT(*) FILTER (WHERE is_read = false AND deleted_at IS NULL)::bigint as conversations_unread,
    COUNT(*) FILTER (WHERE assigned_to_id = v_profile_id AND deleted_at IS NULL)::bigint as conversations_assigned,
    COUNT(*) FILTER (WHERE status = 'pending' AND deleted_at IS NULL)::bigint as conversations_pending,
    COUNT(*) FILTER (WHERE status = 'closed' AND deleted_at IS NULL)::bigint as conversations_closed,
    COUNT(*) FILTER (WHERE is_archived = true AND deleted_at IS NULL)::bigint as conversations_archived,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::bigint as conversations_deleted,
    COUNT(*) FILTER (WHERE channel = 'email' AND deleted_at IS NULL)::bigint as channels_email,
    COUNT(*) FILTER (WHERE channel = 'facebook' AND deleted_at IS NULL)::bigint as channels_facebook,
    COUNT(*) FILTER (WHERE channel = 'instagram' AND deleted_at IS NULL)::bigint as channels_instagram,
    COUNT(*) FILTER (WHERE channel = 'whatsapp' AND deleted_at IS NULL)::bigint as channels_whatsapp
  FROM conversations
  WHERE organization_id = v_org_id
    AND inbox_id = inbox_uuid;
END;
$function$;
