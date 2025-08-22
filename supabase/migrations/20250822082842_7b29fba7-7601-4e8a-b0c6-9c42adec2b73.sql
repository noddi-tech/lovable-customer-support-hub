-- Create the missing get_all_counts function that returns all counts in one query
CREATE OR REPLACE FUNCTION public.get_all_counts()
RETURNS TABLE(
  conversations_all bigint,
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
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH conversation_data AS (
    SELECT 
      c.id,
      c.status,
      c.is_read,
      c.is_archived,
      c.channel::text as channel,
      c.assigned_to_id,
      c.inbox_id
    FROM public.conversations c
    WHERE c.organization_id = public.get_user_organization_id()
  ),
  conversation_counts AS (
    SELECT 
      COUNT(*) as all_count,
      COUNT(*) FILTER (WHERE NOT is_read) as unread_count,
      COUNT(*) FILTER (WHERE assigned_to_id IS NOT NULL) as assigned_count,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
      COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
      COUNT(*) FILTER (WHERE is_archived = true) as archived_count,
      COUNT(*) FILTER (WHERE channel = 'email') as email_count,
      COUNT(*) FILTER (WHERE channel = 'facebook') as facebook_count,
      COUNT(*) FILTER (WHERE channel = 'instagram') as instagram_count,
      COUNT(*) FILTER (WHERE channel = 'whatsapp') as whatsapp_count
    FROM conversation_data
  ),
  notification_counts AS (
    SELECT COUNT(*) as unread_notifications
    FROM public.notifications n
    WHERE n.user_id = auth.uid() AND n.is_read = false
  ),
  inbox_counts AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'name', i.name,
        'color', i.color,
        'conversation_count', COALESCE(inbox_conv_counts.count, 0),
        'is_active', i.is_active
      )
    ) as inboxes_json
    FROM public.inboxes i
    LEFT JOIN (
      SELECT inbox_id, COUNT(*) as count
      FROM conversation_data
      WHERE inbox_id IS NOT NULL
      GROUP BY inbox_id
    ) inbox_conv_counts ON i.id = inbox_conv_counts.inbox_id
    WHERE i.organization_id = public.get_user_organization_id()
  )
  SELECT 
    cc.all_count::bigint,
    cc.unread_count::bigint,
    cc.assigned_count::bigint,
    cc.pending_count::bigint,
    cc.closed_count::bigint,
    cc.archived_count::bigint,
    cc.email_count::bigint,
    cc.facebook_count::bigint,
    cc.instagram_count::bigint,
    cc.whatsapp_count::bigint,
    nc.unread_notifications::bigint,
    COALESCE(ic.inboxes_json, '[]'::jsonb)
  FROM conversation_counts cc
  CROSS JOIN notification_counts nc
  CROSS JOIN inbox_counts ic;
$function$;