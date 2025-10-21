-- Phase 1: Add materialized preview_text column
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS preview_text TEXT;

-- Phase 1: Create trigger function to maintain preview_text automatically
CREATE OR REPLACE FUNCTION public.update_conversation_preview()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- On INSERT: Set preview if this is the first non-internal message
  IF TG_OP = 'INSERT' AND NOT NEW.is_internal THEN
    UPDATE public.conversations 
    SET preview_text = LEFT(public.strip_html_tags(NEW.content), 150)
    WHERE id = NEW.conversation_id 
    AND preview_text IS NULL;
  END IF;
  
  -- On UPDATE: Only update if it's the first message (ordered by created_at)
  IF TG_OP = 'UPDATE' AND NOT NEW.is_internal THEN
    UPDATE public.conversations c
    SET preview_text = LEFT(public.strip_html_tags(NEW.content), 150)
    WHERE c.id = NEW.conversation_id
    AND (
      SELECT m.id FROM public.messages m 
      WHERE m.conversation_id = c.id 
      AND NOT m.is_internal
      ORDER BY m.created_at ASC 
      LIMIT 1
    ) = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on messages table
DROP TRIGGER IF EXISTS messages_maintain_preview ON public.messages;
CREATE TRIGGER messages_maintain_preview
AFTER INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_preview();

-- Phase 1: Backfill existing conversations with preview text
UPDATE public.conversations c
SET preview_text = (
  SELECT LEFT(public.strip_html_tags(m.content), 150)
  FROM public.messages m
  WHERE m.conversation_id = c.id
  AND NOT m.is_internal
  ORDER BY m.created_at ASC
  LIMIT 1
)
WHERE preview_text IS NULL;

-- Phase 2 & 3: Create optimized paginated get_conversations function
CREATE OR REPLACE FUNCTION public.get_conversations(
  inbox_filter uuid DEFAULT NULL,
  status_filter text DEFAULT NULL,
  page_limit integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  subject text,
  status text,
  priority text,
  is_read boolean,
  is_archived boolean,
  channel text,
  updated_at timestamp with time zone,
  received_at timestamp with time zone,
  inbox_id uuid,
  customer jsonb,
  assigned_to jsonb,
  email_account jsonb,
  snooze_until timestamp with time zone,
  preview_text text,
  first_response_at timestamp with time zone,
  sla_breach_at timestamp with time zone,
  sla_status text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  total_rows bigint;
BEGIN
  -- Get total count for pagination UI
  SELECT COUNT(*) INTO total_rows
  FROM public.conversations c
  WHERE c.organization_id = public.get_user_organization_id()
    AND (inbox_filter IS NULL OR c.inbox_id = inbox_filter)
    AND (status_filter IS NULL OR c.status = status_filter)
    AND NOT c.is_archived;
  
  -- Return paginated results with total count
  RETURN QUERY
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
    c.preview_text,
    c.first_response_at,
    c.sla_breach_at,
    public.get_sla_status(c.first_response_at, c.sla_breach_at, c.status) as sla_status,
    total_rows as total_count
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.user_id
  LEFT JOIN public.email_accounts ea ON c.email_account_id = ea.id
  WHERE c.organization_id = public.get_user_organization_id()
    AND (inbox_filter IS NULL OR c.inbox_id = inbox_filter)
    AND (status_filter IS NULL OR c.status = status_filter)
    AND NOT c.is_archived
  ORDER BY COALESCE(c.received_at, c.updated_at) DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- Phase 3: Add comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_org_inbox_updated 
ON public.conversations(organization_id, inbox_id, updated_at DESC) 
WHERE NOT is_archived;

CREATE INDEX IF NOT EXISTS idx_conversations_org_inbox_status 
ON public.conversations(organization_id, inbox_id, status, updated_at DESC) 
WHERE NOT is_archived;

-- Phase 4: Create query performance monitoring table
CREATE TABLE IF NOT EXISTS public.query_performance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  execution_time_ms numeric,
  row_count integer,
  parameters jsonb,
  organization_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_logs_created 
ON public.query_performance_logs(created_at DESC);

ALTER TABLE public.query_performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view performance logs"
ON public.query_performance_logs
FOR SELECT
USING (public.has_permission(auth.uid(), 'manage_settings'::app_permission));

CREATE POLICY "System can insert performance logs"
ON public.query_performance_logs
FOR INSERT
WITH CHECK (true);

-- Phase 4: Create monitored wrapper function
CREATE OR REPLACE FUNCTION public.get_conversations_monitored(
  inbox_filter uuid DEFAULT NULL,
  status_filter text DEFAULT NULL,
  page_limit integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  subject text,
  status text,
  priority text,
  is_read boolean,
  is_archived boolean,
  channel text,
  updated_at timestamp with time zone,
  received_at timestamp with time zone,
  inbox_id uuid,
  customer jsonb,
  assigned_to jsonb,
  email_account jsonb,
  snooze_until timestamp with time zone,
  preview_text text,
  first_response_at timestamp with time zone,
  sla_breach_at timestamp with time zone,
  sla_status text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  start_time timestamptz;
  end_time timestamptz;
  duration_ms numeric;
  result_count integer := 0;
BEGIN
  start_time := clock_timestamp();
  
  RETURN QUERY 
  SELECT * FROM public.get_conversations(
    inbox_filter, 
    status_filter, 
    page_limit, 
    page_offset
  );
  
  GET DIAGNOSTICS result_count = ROW_COUNT;
  
  end_time := clock_timestamp();
  duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  
  IF duration_ms > 500 THEN
    INSERT INTO public.query_performance_logs (
      function_name,
      execution_time_ms,
      row_count,
      parameters,
      organization_id
    ) VALUES (
      'get_conversations',
      duration_ms,
      result_count,
      jsonb_build_object(
        'inbox_filter', inbox_filter,
        'status_filter', status_filter,
        'page_limit', page_limit,
        'page_offset', page_offset
      ),
      public.get_user_organization_id()
    );
  END IF;
END;
$$;