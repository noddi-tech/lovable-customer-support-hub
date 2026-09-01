ALTER TABLE public.inboxes ADD COLUMN IF NOT EXISTS navio_department_id integer;

DROP FUNCTION IF EXISTS public.get_inboxes();

CREATE OR REPLACE FUNCTION public.get_inboxes()
 RETURNS TABLE(id uuid, name text, description text, department_id uuid, navio_department_id integer, is_default boolean, auto_assignment_rules jsonb, color text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, conversation_count bigint, sender_display_name text, purpose text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT i.id, i.name, i.description, i.department_id, i.navio_department_id, i.is_default,
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