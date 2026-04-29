ALTER TABLE public.recruitment_meta_integrations
  ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_health_check_result JSONB,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;