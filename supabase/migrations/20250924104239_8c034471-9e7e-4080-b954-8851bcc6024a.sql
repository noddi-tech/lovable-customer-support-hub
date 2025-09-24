-- Create function to get counts for a specific inbox
CREATE OR REPLACE FUNCTION public.get_inbox_counts(inbox_uuid uuid)
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
  channels_whatsapp bigint
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
      c.assigned_to_id
    FROM public.conversations c
    WHERE c.organization_id = public.get_user_organization_id()
      AND c.inbox_id = inbox_uuid
  )
  SELECT 
    COUNT(*)::bigint as conversations_all,
    COUNT(*) FILTER (WHERE NOT is_read)::bigint as conversations_unread,
    COUNT(*) FILTER (WHERE assigned_to_id IS NOT NULL)::bigint as conversations_assigned,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as conversations_pending,
    COUNT(*) FILTER (WHERE status = 'closed')::bigint as conversations_closed,
    COUNT(*) FILTER (WHERE is_archived = true)::bigint as conversations_archived,
    COUNT(*) FILTER (WHERE channel = 'email')::bigint as channels_email,
    COUNT(*) FILTER (WHERE channel = 'facebook')::bigint as channels_facebook,
    COUNT(*) FILTER (WHERE channel = 'instagram')::bigint as channels_instagram,
    COUNT(*) FILTER (WHERE channel = 'whatsapp')::bigint as channels_whatsapp
  FROM conversation_data;
$function$