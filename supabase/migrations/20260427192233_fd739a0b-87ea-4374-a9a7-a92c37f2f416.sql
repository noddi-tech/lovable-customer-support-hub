
-- =========================================================
-- Phase 6: Integrasjoner foundation (Meta Lead Ads + observability)
-- =========================================================

-- 1) Meta integrations per organization
CREATE TABLE public.recruitment_meta_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  page_name text NOT NULL,
  page_access_token text,
  verify_token text NOT NULL,
  status text NOT NULL DEFAULT 'configured'
    CHECK (status IN ('configured','connected','disconnected','error')),
  status_message text,
  last_event_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recruitment_meta_integrations_unique_page_per_org
    UNIQUE (organization_id, page_id)
);

CREATE INDEX idx_meta_integrations_org
  ON public.recruitment_meta_integrations(organization_id);
CREATE INDEX idx_meta_integrations_verify_token
  ON public.recruitment_meta_integrations(verify_token);

ALTER TABLE public.recruitment_meta_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage meta integrations"
  ON public.recruitment_meta_integrations
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

CREATE TRIGGER trg_meta_integrations_updated_at
  BEFORE UPDATE ON public.recruitment_meta_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Meta form -> position mappings
CREATE TABLE public.recruitment_meta_form_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.recruitment_meta_integrations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  form_id text NOT NULL,
  form_name text,
  position_id uuid REFERENCES public.job_positions(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_form_mappings_unique_form_per_integration
    UNIQUE (integration_id, form_id)
);

CREATE INDEX idx_meta_form_mappings_integration
  ON public.recruitment_meta_form_mappings(integration_id);
CREATE INDEX idx_meta_form_mappings_form_id
  ON public.recruitment_meta_form_mappings(form_id);

ALTER TABLE public.recruitment_meta_form_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage meta form mappings"
  ON public.recruitment_meta_form_mappings
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

CREATE TRIGGER trg_meta_form_mappings_updated_at
  BEFORE UPDATE ON public.recruitment_meta_form_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Lead ingestion log
CREATE TABLE public.recruitment_lead_ingestion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source text NOT NULL,
  external_id text,
  integration_id uuid REFERENCES public.recruitment_meta_integrations(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('success','failed','duplicate','invalid')),
  applicant_id uuid REFERENCES public.applicants(id) ON DELETE SET NULL,
  error_message text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_ingestion_log_org
  ON public.recruitment_lead_ingestion_log(organization_id, created_at DESC);
CREATE INDEX idx_lead_ingestion_log_external_id
  ON public.recruitment_lead_ingestion_log(external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE public.recruitment_lead_ingestion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins view ingestion log"
  ON public.recruitment_lead_ingestion_log
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_memberships om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );
-- INSERT/UPDATE/DELETE only via service role (no policies = denied for authenticated users)

-- 4) applicants.external_id for dedup
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_applicants_external_id_unique
  ON public.applicants(organization_id, external_id)
  WHERE external_id IS NOT NULL;

-- 5) Update applicants.source CHECK to include 'other'
ALTER TABLE public.applicants DROP CONSTRAINT IF EXISTS applicants_source_check;
ALTER TABLE public.applicants
  ADD CONSTRAINT applicants_source_check
  CHECK (source IN ('manual','csv_import','meta_lead_ad','finn','website','referral','other'));

-- 6) Backfill source_details from metadata for non-manual sources
UPDATE public.applicants
SET source_details = metadata,
    metadata = '{}'::jsonb
WHERE source != 'manual'
  AND metadata IS NOT NULL
  AND metadata <> '{}'::jsonb
  AND (source_details IS NULL OR source_details = '{}'::jsonb);
