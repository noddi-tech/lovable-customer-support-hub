DROP FUNCTION IF EXISTS public.get_conversations_with_session_recovery(uuid, boolean);
DROP FUNCTION IF EXISTS public.get_inboxes();

CREATE OR REPLACE FUNCTION public.get_conversations_with_session_recovery(inbox_uuid uuid DEFAULT NULL::uuid, include_deleted boolean DEFAULT false)
 RETURNS TABLE(id uuid, subject text, status text, priority text, is_read boolean, is_archived boolean, is_deleted boolean, channel text, updated_at timestamp with time zone, received_at timestamp with time zone, inbox_id uuid, customer jsonb, assigned_to jsonb, snooze_until timestamp with time zone, session_uid uuid, organization_id uuid, preview_text text, first_response_at timestamp with time zone, sla_breach_at timestamp with time zone, metadata jsonb, last_message_is_internal boolean, last_message_sender_type text, conversation_type text, applicant_id uuid, applicant jsonb)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE current_uid uuid; user_org_id uuid;
BEGIN
  current_uid := auth.uid();
  SELECT p.organization_id INTO user_org_id FROM public.profiles p WHERE p.user_id = current_uid;
  IF user_org_id IS NULL THEN
    SELECT om.organization_id INTO user_org_id FROM public.organization_memberships om
      WHERE om.user_id = current_uid AND om.status = 'active' LIMIT 1;
  END IF;
  IF user_org_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT
    c.id, c.subject, c.status, c.priority, c.is_read, c.is_archived,
    (c.deleted_at IS NOT NULL) as is_deleted,
    c.channel::TEXT, c.updated_at, c.received_at, c.inbox_id,
    CASE WHEN cu.id IS NOT NULL THEN jsonb_build_object('id', cu.id, 'full_name', cu.full_name, 'email', cu.email) ELSE NULL END,
    CASE WHEN p.id IS NOT NULL THEN jsonb_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url) ELSE NULL END,
    c.snooze_until, current_uid, c.organization_id,
    c.preview_text, c.first_response_at, c.sla_breach_at, c.metadata,
    COALESCE(c.last_message_is_internal, false), COALESCE(c.last_message_sender_type, 'agent'),
    COALESCE(c.conversation_type, 'support'), c.applicant_id,
    CASE WHEN ap.id IS NOT NULL THEN jsonb_build_object('id', ap.id, 'first_name', ap.first_name, 'last_name', ap.last_name, 'email', ap.email) ELSE NULL END
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.id
  LEFT JOIN public.applicants ap ON c.applicant_id = ap.id
  WHERE c.organization_id = user_org_id
    AND (inbox_uuid IS NULL OR c.inbox_id = inbox_uuid)
    AND ((include_deleted = true AND c.deleted_at IS NOT NULL) OR (include_deleted = false AND c.deleted_at IS NULL))
  ORDER BY COALESCE(c.received_at, c.updated_at) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_inboxes()
 RETURNS TABLE(id uuid, name text, description text, department_id uuid, is_default boolean, auto_assignment_rules jsonb, color text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, conversation_count bigint, sender_display_name text, purpose text)
 LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT i.id, i.name, i.description, i.department_id, i.is_default,
    i.auto_assignment_rules, i.color, i.is_active, i.created_at, i.updated_at,
    COALESCE(cc.count, 0), i.sender_display_name, COALESCE(i.purpose, 'support')
  FROM public.inboxes i
  LEFT JOIN (
    SELECT inbox_id, COUNT(*) as count FROM public.conversations
    WHERE organization_id = public.get_user_organization_id() GROUP BY inbox_id
  ) cc ON i.id = cc.inbox_id
  WHERE i.organization_id = public.get_user_organization_id()
  ORDER BY i.is_default DESC, i.created_at ASC;
$function$;