-- Create email_domains table for per-organization email domain config
CREATE TABLE IF NOT EXISTS public.email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  domain TEXT NOT NULL,
  parse_subdomain TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'sendgrid',
  dns_records JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, domain)
);

-- Create inbound_routes table to map inbound addresses to inboxes/groups
CREATE TABLE IF NOT EXISTS public.inbound_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  domain_id UUID NOT NULL REFERENCES public.email_domains(id) ON DELETE CASCADE,
  inbox_id UUID NULL REFERENCES public.inboxes(id) ON DELETE SET NULL,
  alias_local_part TEXT NOT NULL,
  address TEXT NOT NULL,
  group_email TEXT NULL,
  secret_token TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, address)
);

-- Function to compute address before insert/update
CREATE OR REPLACE FUNCTION public.set_inbound_route_address()
RETURNS TRIGGER AS $$
DECLARE
  full_domain TEXT;
BEGIN
  SELECT (parse_subdomain || '.' || domain) INTO full_domain
  FROM public.email_domains d
  WHERE d.id = NEW.domain_id;

  IF full_domain IS NULL THEN
    RAISE EXCEPTION 'Invalid domain_id: %', NEW.domain_id;
  END IF;

  NEW.address := LOWER(NEW.alias_local_part || '@' || full_domain);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Triggers to compute address
DROP TRIGGER IF EXISTS trg_set_inbound_route_address_ins ON public.inbound_routes;
CREATE TRIGGER trg_set_inbound_route_address_ins
BEFORE INSERT ON public.inbound_routes
FOR EACH ROW EXECUTE FUNCTION public.set_inbound_route_address();

DROP TRIGGER IF EXISTS trg_set_inbound_route_address_upd ON public.inbound_routes;
CREATE TRIGGER trg_set_inbound_route_address_upd
BEFORE UPDATE OF alias_local_part, domain_id ON public.inbound_routes
FOR EACH ROW EXECUTE FUNCTION public.set_inbound_route_address();

-- Enable RLS
ALTER TABLE public.email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_routes ENABLE ROW LEVEL SECURITY;

-- Policies: Org members can view; only admins (manage_settings) can write
-- View policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_domains' AND policyname = 'Users can view email domains in their organization'
  ) THEN
    CREATE POLICY "Users can view email domains in their organization"
    ON public.email_domains FOR SELECT
    USING (organization_id = public.get_user_organization_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inbound_routes' AND policyname = 'Users can view inbound routes in their organization'
  ) THEN
    CREATE POLICY "Users can view inbound routes in their organization"
    ON public.inbound_routes FOR SELECT
    USING (organization_id = public.get_user_organization_id());
  END IF;
END $$;

-- Write policies (manage_settings permission)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_domains' AND policyname = 'Admins can manage email domains'
  ) THEN
    CREATE POLICY "Admins can manage email domains"
    ON public.email_domains FOR ALL
    USING (
      organization_id = public.get_user_organization_id()
      AND public.has_permission(auth.uid(), 'manage_settings'::app_permission)
    )
    WITH CHECK (
      organization_id = public.get_user_organization_id()
      AND public.has_permission(auth.uid(), 'manage_settings'::app_permission)
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inbound_routes' AND policyname = 'Admins can manage inbound routes'
  ) THEN
    CREATE POLICY "Admins can manage inbound routes"
    ON public.inbound_routes FOR ALL
    USING (
      organization_id = public.get_user_organization_id()
      AND public.has_permission(auth.uid(), 'manage_settings'::app_permission)
    )
    WITH CHECK (
      organization_id = public.get_user_organization_id()
      AND public.has_permission(auth.uid(), 'manage_settings'::app_permission)
    );
  END IF;
END $$;

-- Triggers for updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_email_domains_updated_at'
  ) THEN
    CREATE TRIGGER update_email_domains_updated_at
    BEFORE UPDATE ON public.email_domains
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_inbound_routes_updated_at'
  ) THEN
    CREATE TRIGGER update_inbound_routes_updated_at
    BEFORE UPDATE ON public.inbound_routes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_email_domains_org ON public.email_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_inbound_routes_org_addr ON public.inbound_routes(organization_id, address);
