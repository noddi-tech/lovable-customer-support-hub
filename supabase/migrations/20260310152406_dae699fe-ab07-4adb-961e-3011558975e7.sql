ALTER TABLE public.slack_integrations 
  ADD COLUMN IF NOT EXISTS secondary_access_token text,
  ADD COLUMN IF NOT EXISTS secondary_team_name text,
  ADD COLUMN IF NOT EXISTS secondary_team_id text;