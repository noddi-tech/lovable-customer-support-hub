-- Fix get_inbox_counts to compare with profile ID, not auth.uid()
DROP FUNCTION IF EXISTS public.get_inbox_counts(uuid);

CREATE OR REPLACE FUNCTION public.get_inbox_counts(inbox_uuid uuid)
RETURNS TABLE(
  conversations_all bigint,
  conversations_open bigint,
  conversations_unread bigint,
  conversations_assigned bigint,
  conversations_pending bigint,
  conversations_closed bigint,
  conversations_archived bigint,
  conversations_deleted bigint,
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
  v_profile_id uuid;
BEGIN
  -- Get the user's profile ID (not auth.uid() since assigned_to_id references profiles.id)
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
    COUNT(*) FILTER (WHERE deleted_at IS NULL)::bigint as total,
    COUNT(*) FILTER (WHERE status = 'open' AND deleted_at IS NULL)::bigint as open_count,
    COUNT(*) FILTER (WHERE is_read = false AND deleted_at IS NULL)::bigint as unread_count,
    -- Fixed: Compare with profile ID instead of auth.uid()
    COUNT(*) FILTER (WHERE assigned_to_id = v_profile_id AND deleted_at IS NULL)::bigint as assigned_count,
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
$$;

-- Fix get_all_counts to compare with profile ID, not auth.uid()
DROP FUNCTION IF EXISTS public.get_all_counts();

CREATE OR REPLACE FUNCTION public.get_all_counts()
RETURNS TABLE(
  conversations_all bigint,
  conversations_open bigint,
  conversations_unread bigint,
  conversations_assigned bigint,
  conversations_pending bigint,
  conversations_closed bigint,
  conversations_archived bigint,
  conversations_deleted bigint,
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
  v_profile_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Get the user's profile ID (not auth.uid() since assigned_to_id references profiles.id)
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
      COUNT(*) FILTER (WHERE deleted_at IS NULL)::bigint as total,
      COUNT(*) FILTER (WHERE status = 'open' AND deleted_at IS NULL)::bigint as open_count,
      COUNT(*) FILTER (WHERE is_read = false AND deleted_at IS NULL)::bigint as unread_count,
      -- Fixed: Compare with profile ID instead of auth.uid()
      COUNT(*) FILTER (WHERE assigned_to_id = v_profile_id AND deleted_at IS NULL)::bigint as assigned_count,
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
$$;