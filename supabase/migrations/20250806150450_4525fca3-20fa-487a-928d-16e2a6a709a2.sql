-- Enable the required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a scheduled job to auto-sync emails every 2 minutes
SELECT cron.schedule(
  'gmail-auto-sync',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/gmail-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE"}'::jsonb,
        body:='{"syncSent": true}'::jsonb
    ) as request_id;
  $$
);

-- Add a table to track auto-sync settings
CREATE TABLE IF NOT EXISTS public.email_sync_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  auto_sync_enabled boolean NOT NULL DEFAULT true,
  sync_interval_minutes integer NOT NULL DEFAULT 2,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.email_sync_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view sync settings in their organization" 
ON public.email_sync_settings 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update sync settings in their organization" 
ON public.email_sync_settings 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert sync settings for their organization" 
ON public.email_sync_settings 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

-- Insert default sync settings for existing organizations
INSERT INTO public.email_sync_settings (organization_id, auto_sync_enabled, sync_interval_minutes)
SELECT DISTINCT organization_id, true, 2
FROM public.email_accounts
WHERE organization_id NOT IN (SELECT organization_id FROM public.email_sync_settings);

-- Create trigger to update timestamp
CREATE TRIGGER update_email_sync_settings_updated_at
BEFORE UPDATE ON public.email_sync_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();