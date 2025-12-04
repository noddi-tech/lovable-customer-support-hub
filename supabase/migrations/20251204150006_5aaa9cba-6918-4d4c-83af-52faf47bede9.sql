-- Create slack_integrations table (organization-scoped)
CREATE TABLE public.slack_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  
  -- OAuth tokens
  access_token TEXT,
  team_id TEXT,
  team_name TEXT,
  bot_user_id TEXT,
  
  -- Channel configuration
  default_channel_id TEXT,
  default_channel_name TEXT,
  
  -- Event configuration
  configuration JSONB DEFAULT '{
    "enabled_events": ["new_conversation", "customer_reply", "assignment", "mention"],
    "mention_assigned_user": true,
    "include_message_preview": true
  }'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.slack_integrations ENABLE ROW LEVEL SECURITY;

-- RLS policies (following voice_integrations pattern)
CREATE POLICY "Users can view slack integrations in their organization"
  ON public.slack_integrations FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can insert slack integrations in their organization"
  ON public.slack_integrations FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission));

CREATE POLICY "Admins can update slack integrations in their organization"
  ON public.slack_integrations FOR UPDATE
  USING (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission))
  WITH CHECK (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission));

CREATE POLICY "Admins can delete slack integrations in their organization"
  ON public.slack_integrations FOR DELETE
  USING (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission));

-- Create updated_at trigger
CREATE TRIGGER update_slack_integrations_updated_at
  BEFORE UPDATE ON public.slack_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();