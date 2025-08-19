-- Create table for storing voice integration configurations
CREATE TABLE IF NOT EXISTS public.voice_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'aircall', 'twilio', etc.
  is_active boolean NOT NULL DEFAULT true,
  webhook_token text,
  configuration jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, provider)
);

-- Enable Row Level Security
ALTER TABLE public.voice_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for voice integrations
CREATE POLICY "Users can view voice integrations in their organization"
  ON public.voice_integrations
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert voice integrations in their organization"
  ON public.voice_integrations
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update voice integrations in their organization"
  ON public.voice_integrations
  FOR UPDATE
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete voice integrations in their organization"
  ON public.voice_integrations
  FOR DELETE
  USING (organization_id = get_user_organization_id());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_voice_integrations_updated_at
  BEFORE UPDATE ON public.voice_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();