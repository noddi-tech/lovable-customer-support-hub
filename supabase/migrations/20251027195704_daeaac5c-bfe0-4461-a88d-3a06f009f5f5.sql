-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Email notification preferences
  email_on_ticket_assigned BOOLEAN DEFAULT true,
  email_on_ticket_updated BOOLEAN DEFAULT true,
  email_on_ticket_commented BOOLEAN DEFAULT true,
  email_on_sla_breach BOOLEAN DEFAULT true,
  
  -- In-app notification preferences
  app_on_ticket_assigned BOOLEAN DEFAULT true,
  app_on_ticket_updated BOOLEAN DEFAULT true,
  app_on_ticket_commented BOOLEAN DEFAULT true,
  app_on_sla_breach BOOLEAN DEFAULT true,
  
  -- Digest preferences
  daily_digest_enabled BOOLEAN DEFAULT false,
  weekly_digest_enabled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (user_id = auth.uid() AND organization_id = get_user_organization_id());

-- Create system_events_log table for edge function logging
CREATE TABLE IF NOT EXISTS public.system_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL, -- 'edge_function', 'trigger', 'scheduled_job', etc.
  event_data JSONB DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for querying logs
CREATE INDEX IF NOT EXISTS idx_system_events_log_org ON public.system_events_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_log_type ON public.system_events_log(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_log_severity ON public.system_events_log(severity);

-- Enable RLS
ALTER TABLE public.system_events_log ENABLE ROW LEVEL SECURITY;

-- RLS policies (admins only)
CREATE POLICY "Admins can view system logs in their organization"
ON public.system_events_log FOR SELECT
USING (
  organization_id = get_user_organization_id() AND
  has_permission(auth.uid(), 'manage_settings'::app_permission)
);

CREATE POLICY "System can insert logs"
ON public.system_events_log FOR INSERT
WITH CHECK (true);

-- Create webhook_retry_queue table
CREATE TABLE IF NOT EXISTS public.webhook_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL, -- 'email_notification', 'external_api', etc.
  payload JSONB NOT NULL,
  target_url TEXT,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for processing queue
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_status ON public.webhook_retry_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_org ON public.webhook_retry_queue(organization_id);

-- Enable RLS
ALTER TABLE public.webhook_retry_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies (system only)
CREATE POLICY "System can manage webhook queue"
ON public.webhook_retry_queue FOR ALL
USING (true);