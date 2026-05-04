-- Phase B4: Admin alerts table for recruitment integration health
CREATE TABLE public.recruitment_admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id uuid NULL REFERENCES public.recruitment_meta_integrations(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN (
    'token_expiring_soon',
    'token_expiring_critical',
    'token_expired',
    'integration_broken'
  )),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  resolved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recruitment_admin_alerts_unresolved
  ON public.recruitment_admin_alerts (organization_id, resolved_at)
  WHERE resolved_at IS NULL;

CREATE INDEX idx_recruitment_admin_alerts_integration
  ON public.recruitment_admin_alerts (integration_id)
  WHERE integration_id IS NOT NULL;

ALTER TABLE public.recruitment_admin_alerts ENABLE ROW LEVEL SECURITY;

-- Org admins can view alerts for their org
CREATE POLICY "Org admins view recruitment alerts"
  ON public.recruitment_admin_alerts
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

-- Org admins can resolve (update) alerts for their org
CREATE POLICY "Org admins update recruitment alerts"
  ON public.recruitment_admin_alerts
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_memberships om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

-- Inserts only via service role (backend health check) — no policy for authenticated users.

CREATE TRIGGER trg_recruitment_admin_alerts_updated_at
  BEFORE UPDATE ON public.recruitment_admin_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();