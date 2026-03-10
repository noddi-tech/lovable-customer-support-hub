ALTER TABLE public.slack_integrations 
  ADD COLUMN IF NOT EXISTS digest_channel_id text,
  ADD COLUMN IF NOT EXISTS digest_channel_name text,
  ADD COLUMN IF NOT EXISTS critical_channel_id text,
  ADD COLUMN IF NOT EXISTS critical_channel_name text;