-- 1) Extend recruitment_meta_integrations with OAuth fields
ALTER TABLE public.recruitment_meta_integrations
  ADD COLUMN IF NOT EXISTS user_access_token TEXT,
  ADD COLUMN IF NOT EXISTS user_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS connected_via TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS oauth_user_id TEXT,
  ADD COLUMN IF NOT EXISTS oauth_user_name TEXT,
  ADD COLUMN IF NOT EXISTS deauthorized_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE public.recruitment_meta_integrations
    ADD CONSTRAINT recruitment_meta_integrations_connected_via_check
    CHECK (connected_via IN ('manual','oauth'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) recruitment_meta_oauth_states (in-progress OAuth sessions)
CREATE TABLE IF NOT EXISTS public.recruitment_meta_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nonce TEXT NOT NULL,
  origin TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  long_lived_user_token TEXT,
  token_expires_at TIMESTAMPTZ,
  oauth_user_id TEXT,
  oauth_user_name TEXT,
  mode TEXT NOT NULL DEFAULT 'create',
  existing_integration_id UUID REFERENCES public.recruitment_meta_integrations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_meta_oauth_states_nonce
  ON public.recruitment_meta_oauth_states(nonce);
CREATE INDEX IF NOT EXISTS idx_meta_oauth_states_org_created
  ON public.recruitment_meta_oauth_states(organization_id, created_at DESC);

ALTER TABLE public.recruitment_meta_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage own meta oauth states"
  ON public.recruitment_meta_oauth_states
  FOR ALL
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_memberships om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_memberships om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

-- 3) recruitment_meta_data_deletion_requests
CREATE TABLE IF NOT EXISTS public.recruitment_meta_data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code TEXT NOT NULL UNIQUE,
  oauth_user_id TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  details JSONB,
  CONSTRAINT recruitment_meta_data_deletion_requests_status_check
    CHECK (status IN ('pending','completed','failed'))
);

CREATE INDEX IF NOT EXISTS idx_meta_data_deletion_code
  ON public.recruitment_meta_data_deletion_requests(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_meta_data_deletion_oauth_user
  ON public.recruitment_meta_data_deletion_requests(oauth_user_id);

ALTER TABLE public.recruitment_meta_data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Public can read by code (status page is unauthenticated).
-- The confirmation_code is a 24+ char random string acting as a capability token.
CREATE POLICY "Public can read deletion request status"
  ON public.recruitment_meta_data_deletion_requests
  FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies => only service role can write.
