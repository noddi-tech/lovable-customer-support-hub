-- Create function to strip HTML tags with proper search_path
CREATE OR REPLACE FUNCTION public.strip_html_tags(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove all HTML tags
  input_text := regexp_replace(input_text, '<[^>]*>', '', 'g');
  
  -- Decode common HTML entities
  input_text := replace(input_text, '&nbsp;', ' ');
  input_text := replace(input_text, '&lt;', '<');
  input_text := replace(input_text, '&gt;', '>');
  input_text := replace(input_text, '&amp;', '&');
  input_text := replace(input_text, '&quot;', '"');
  input_text := replace(input_text, '&#39;', '''');
  input_text := replace(input_text, '&apos;', '''');
  
  -- Remove extra whitespace
  input_text := regexp_replace(input_text, '\s+', ' ', 'g');
  input_text := trim(input_text);
  
  RETURN input_text;
END;
$$;

-- Update get_conversations() to use strip_html_tags for preview text
CREATE OR REPLACE FUNCTION public.get_conversations()
 RETURNS TABLE(id uuid, subject text, status text, priority text, is_read boolean, is_archived boolean, channel text, updated_at timestamp with time zone, received_at timestamp with time zone, inbox_id uuid, customer jsonb, assigned_to jsonb, email_account jsonb, snooze_until timestamp with time zone, preview_text text, first_response_at timestamp with time zone, sla_breach_at timestamp with time zone, sla_status text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT 
    c.id,
    c.subject,
    c.status,
    c.priority,
    c.is_read,
    c.is_archived,
    c.channel::TEXT,
    c.updated_at,
    c.received_at,
    c.inbox_id,
    CASE 
      WHEN cu.id IS NOT NULL 
      THEN jsonb_build_object('id', cu.id, 'full_name', cu.full_name, 'email', cu.email)
      ELSE NULL 
    END as customer,
    CASE 
      WHEN p.id IS NOT NULL 
      THEN jsonb_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url)
      ELSE NULL 
    END as assigned_to,
    CASE 
      WHEN ea.id IS NOT NULL 
      THEN jsonb_build_object('id', ea.id, 'email_address', ea.email_address)
      ELSE NULL 
    END as email_account,
    c.snooze_until,
    -- Strip HTML tags from preview text and take first 150 characters
    (
      SELECT LEFT(COALESCE(public.strip_html_tags(m.content), ''), 150)
      FROM public.messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.created_at ASC
      LIMIT 1
    ) as preview_text,
    c.first_response_at,
    c.sla_breach_at,
    public.get_sla_status(c.first_response_at, c.sla_breach_at, c.status) as sla_status
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.user_id
  LEFT JOIN public.email_accounts ea ON c.email_account_id = ea.id
  WHERE c.organization_id = public.get_user_organization_id()
  ORDER BY COALESCE(c.received_at, c.updated_at) DESC;
$function$;