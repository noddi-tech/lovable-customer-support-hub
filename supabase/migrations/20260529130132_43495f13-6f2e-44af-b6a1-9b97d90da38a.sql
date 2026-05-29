-- Phase 11C Milestone 1 — Candidate self-service form tokens

CREATE TABLE public.candidate_form_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,

  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,

  used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  channel text NOT NULL CHECK (channel IN ('email','sms','manual')),

  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  last_attempt_ip text,

  opened_at timestamptz,
  submitted_at timestamptz,
  submitted_ip text,
  submitted_user_agent text
);

CREATE INDEX idx_candidate_form_tokens_application
  ON public.candidate_form_tokens(application_id, created_at DESC);
CREATE INDEX idx_candidate_form_tokens_applicant
  ON public.candidate_form_tokens(applicant_id, created_at DESC);
CREATE INDEX idx_candidate_form_tokens_org
  ON public.candidate_form_tokens(organization_id);
CREATE INDEX idx_candidate_form_tokens_active_expiry
  ON public.candidate_form_tokens(expires_at)
  WHERE used_at IS NULL AND revoked_at IS NULL;

-- Grants
GRANT SELECT ON public.candidate_form_tokens TO authenticated;
GRANT ALL ON public.candidate_form_tokens TO service_role;

-- RLS
ALTER TABLE public.candidate_form_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view candidate form tokens"
  ON public.candidate_form_tokens FOR SELECT
  USING (public.is_org_member(organization_id));

-- No INSERT/UPDATE/DELETE policies: writes are service-role only via edge functions.

-- Config columns on organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS candidate_form_default_expiry_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS candidate_form_brand_color text,
  ADD COLUMN IF NOT EXISTS candidate_form_logo_url text;

-- Config columns on job_positions
ALTER TABLE public.job_positions
  ADD COLUMN IF NOT EXISTS candidate_form_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS candidate_form_intro_text text;
