-- Add sender_display_name to organizations table
ALTER TABLE public.organizations 
ADD COLUMN sender_display_name TEXT NULL;

-- Set default sender_display_name to organization name for existing orgs
UPDATE public.organizations 
SET sender_display_name = name 
WHERE sender_display_name IS NULL;

-- Add sender_display_name override to inboxes table (NULL means inherit from org)
ALTER TABLE public.inboxes 
ADD COLUMN sender_display_name TEXT NULL;

-- Add optional sender_display_name to inbound_routes for granular control
ALTER TABLE public.inbound_routes 
ADD COLUMN sender_display_name TEXT NULL;

-- Drop and recreate get_inboxes function with sender_display_name
DROP FUNCTION IF EXISTS public.get_inboxes();

CREATE OR REPLACE FUNCTION public.get_inboxes()
 RETURNS TABLE(id uuid, name text, description text, department_id uuid, is_default boolean, auto_assignment_rules jsonb, color text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, conversation_count bigint, sender_display_name text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT 
    i.id,
    i.name,
    i.description,
    i.department_id,
    i.is_default,
    i.auto_assignment_rules,
    i.color,
    i.is_active,
    i.created_at,
    i.updated_at,
    COALESCE(conversation_counts.count, 0) as conversation_count,
    i.sender_display_name
  FROM public.inboxes i
  LEFT JOIN (
    SELECT inbox_id, COUNT(*) as count
    FROM public.conversations 
    WHERE organization_id = public.get_user_organization_id()
    GROUP BY inbox_id
  ) conversation_counts ON i.id = conversation_counts.inbox_id
  WHERE i.organization_id = public.get_user_organization_id()
  ORDER BY i.is_default DESC, i.created_at ASC;
$function$;