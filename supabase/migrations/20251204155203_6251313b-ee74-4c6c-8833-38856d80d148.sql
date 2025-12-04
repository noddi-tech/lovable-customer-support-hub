-- Add per-organization Slack credentials columns
ALTER TABLE public.slack_integrations 
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS client_secret TEXT,
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;