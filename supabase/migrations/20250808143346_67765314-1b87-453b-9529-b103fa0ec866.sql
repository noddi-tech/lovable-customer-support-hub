-- Add snooze columns to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snoozed_by_id UUID;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_conversations_snooze_until ON public.conversations (snooze_until);

-- Update get_conversations function to include snooze_until
CREATE OR REPLACE FUNCTION public.get_conversations()
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
  customer jsonb,
  assigned_to jsonb,
  snooze_until timestamp with time zone
)
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
    c.snooze_until
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.user_id
  WHERE c.organization_id = public.get_user_organization_id()
  ORDER BY COALESCE(c.received_at, c.updated_at) DESC;
$function$;

-- Schedule edge function to check snoozed conversations every minute (requires pg_cron & pg_net)
-- Create or replace schedule idempotently by removing existing with same name
select cron.unschedule('snooze-notifier-every-minute') where exists (
  select 1 from cron.job where jobname = 'snooze-notifier-every-minute'
);
select
cron.schedule(
  'snooze-notifier-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/snooze-notifier',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('invoked_at', now())
  ) as request_id;
  $$
);
