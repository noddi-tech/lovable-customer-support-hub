
-- =========================================================
-- PHASE 1: CUSTOMER IDENTITIES + CUSTOMER NOTES
-- =========================================================

CREATE TABLE public.customer_identities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  identity_type text NOT NULL CHECK (identity_type IN ('email','phone','navio_user_id','widget_visitor','external')),
  value text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX customer_identities_unique_value
  ON public.customer_identities (organization_id, identity_type, lower(value));
CREATE INDEX customer_identities_customer_idx ON public.customer_identities (customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_identities TO authenticated;
GRANT ALL ON public.customer_identities TO service_role;
ALTER TABLE public.customer_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view customer identities"
  ON public.customer_identities FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Org members can insert customer identities"
  ON public.customer_identities FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Org members can update customer identities"
  ON public.customer_identities FOR UPDATE TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id())
  WITH CHECK (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Org members can delete customer identities"
  ON public.customer_identities FOR DELETE TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

-- Backfill from existing customers
INSERT INTO public.customer_identities (organization_id, customer_id, identity_type, value, is_primary, verified)
SELECT DISTINCT ON (c.organization_id, lower(c.email))
       c.organization_id, c.id, 'email', c.email, true, true
FROM public.customers c
WHERE c.email IS NOT NULL AND btrim(c.email) <> ''
ORDER BY c.organization_id, lower(c.email), c.created_at
ON CONFLICT DO NOTHING;

INSERT INTO public.customer_identities (organization_id, customer_id, identity_type, value, is_primary, verified)
SELECT DISTINCT ON (c.organization_id, lower(c.phone))
       c.organization_id, c.id, 'phone', c.phone, false, false
FROM public.customers c
WHERE c.phone IS NOT NULL AND btrim(c.phone) <> ''
ORDER BY c.organization_id, lower(c.phone), c.created_at
ON CONFLICT DO NOTHING;

CREATE TABLE public.customer_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_notes_customer_idx ON public.customer_notes (customer_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO authenticated;
GRANT ALL ON public.customer_notes TO service_role;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view customer notes"
  ON public.customer_notes FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Org members can insert customer notes"
  ON public.customer_notes FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Authors can update customer notes"
  ON public.customer_notes FOR UPDATE TO authenticated
  USING (is_super_admin() OR (organization_id = get_user_organization_id() AND created_by_id = current_profile_id()))
  WITH CHECK (is_super_admin() OR (organization_id = get_user_organization_id() AND created_by_id = current_profile_id()));
CREATE POLICY "Authors or admins can delete customer notes"
  ON public.customer_notes FOR DELETE TO authenticated
  USING (is_super_admin() OR (organization_id = get_user_organization_id()
         AND (created_by_id = current_profile_id() OR has_permission(auth.uid(), 'manage_settings'::app_permission))));

-- =========================================================
-- PHASE 2 + 4: TAXONOMY
-- =========================================================

CREATE TABLE public.case_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE public.case_resolution_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE public.case_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_categories TO authenticated;
GRANT ALL ON public.case_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_resolution_codes TO authenticated;
GRANT ALL ON public.case_resolution_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_tags TO authenticated;
GRANT ALL ON public.case_tags TO service_role;

ALTER TABLE public.case_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_resolution_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view case categories" ON public.case_categories FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Admins can manage case categories" ON public.case_categories FOR ALL TO authenticated
  USING (is_super_admin() OR (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission)))
  WITH CHECK (is_super_admin() OR (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission)));

CREATE POLICY "Org members can view resolution codes" ON public.case_resolution_codes FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Admins can manage resolution codes" ON public.case_resolution_codes FOR ALL TO authenticated
  USING (is_super_admin() OR (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission)))
  WITH CHECK (is_super_admin() OR (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission)));

CREATE POLICY "Org members can view case tags" ON public.case_tags FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Org members can manage case tags" ON public.case_tags FOR ALL TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id())
  WITH CHECK (is_super_admin() OR organization_id = get_user_organization_id());

-- =========================================================
-- PHASE 3: SLA POLICIES
-- =========================================================

CREATE TABLE public.sla_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  inbox_id uuid REFERENCES public.inboxes(id) ON DELETE CASCADE,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  first_response_minutes integer NOT NULL DEFAULT 240,
  resolution_minutes integer NOT NULL DEFAULT 1440,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sla_policies_scope_idx
  ON public.sla_policies (organization_id, coalesce(inbox_id, '00000000-0000-0000-0000-000000000000'::uuid), priority);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sla_policies TO authenticated;
GRANT ALL ON public.sla_policies TO service_role;
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view sla policies" ON public.sla_policies FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Admins can manage sla policies" ON public.sla_policies FOR ALL TO authenticated
  USING (is_super_admin() OR (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission)))
  WITH CHECK (is_super_admin() OR (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission)));

-- =========================================================
-- PHASE 2: CASES
-- =========================================================

CREATE SEQUENCE public.case_number_seq START 1000;

CREATE TABLE public.cases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_number bigint NOT NULL DEFAULT nextval('public.case_number_seq'),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','waiting_customer','waiting_internal','resolved','closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  category_id uuid REFERENCES public.case_categories(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  inbox_id uuid REFERENCES public.inboxes(id) ON DELETE SET NULL,
  source_channel text,
  due_at timestamptz,
  first_response_due_at timestamptz,
  resolution_due_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  resolution_code_id uuid REFERENCES public.case_resolution_codes(id) ON DELETE SET NULL,
  resolution_notes text,
  navio_ticket_id text,
  created_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, case_number)
);
CREATE INDEX cases_org_status_idx ON public.cases (organization_id, status);
CREATE INDEX cases_owner_idx ON public.cases (owner_id, status);
CREATE INDEX cases_customer_idx ON public.cases (customer_id, created_at DESC);
CREATE INDEX cases_due_idx ON public.cases (due_at) WHERE status NOT IN ('resolved','closed');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view cases" ON public.cases FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Org members can insert cases" ON public.cases FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Org members can update cases" ON public.cases FOR UPDATE TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id())
  WITH CHECK (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Admins can delete cases" ON public.cases FOR DELETE TO authenticated
  USING (is_super_admin() OR (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission)));

CREATE TABLE public.case_tag_links (
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.case_tags(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_tag_links TO authenticated;
GRANT ALL ON public.case_tag_links TO service_role;
ALTER TABLE public.case_tag_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view case tag links" ON public.case_tag_links FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Org members can manage case tag links" ON public.case_tag_links FOR ALL TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id())
  WITH CHECK (is_super_admin() OR organization_id = get_user_organization_id());

CREATE TABLE public.case_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  from_value text,
  to_value text,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX case_events_case_idx ON public.case_events (case_id, created_at DESC);

GRANT SELECT, INSERT ON public.case_events TO authenticated;
GRANT ALL ON public.case_events TO service_role;
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view case events" ON public.case_events FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY "Org members can insert case events" ON public.case_events FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR organization_id = get_user_organization_id());

-- Link conversations and calls to cases
ALTER TABLE public.conversations ADD COLUMN case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL;
CREATE INDEX conversations_case_idx ON public.conversations (case_id);
ALTER TABLE public.calls ADD COLUMN case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL;
CREATE INDEX calls_case_idx ON public.calls (case_id);

-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER customer_identities_updated_at BEFORE UPDATE ON public.customer_identities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER customer_notes_updated_at BEFORE UPDATE ON public.customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER case_categories_updated_at BEFORE UPDATE ON public.case_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER case_resolution_codes_updated_at BEFORE UPDATE ON public.case_resolution_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sla_policies_updated_at BEFORE UPDATE ON public.sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cases_updated_at BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Apply SLA targets on insert and on priority/inbox change
CREATE OR REPLACE FUNCTION public.apply_case_sla()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  p public.sla_policies%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.sla_policies
   WHERE organization_id = NEW.organization_id
     AND is_active
     AND priority = NEW.priority
     AND (inbox_id = NEW.inbox_id OR inbox_id IS NULL)
   ORDER BY (inbox_id IS NOT NULL) DESC
   LIMIT 1;

  IF FOUND THEN
    NEW.first_response_due_at = COALESCE(NEW.first_response_at, now()) + make_interval(mins => p.first_response_minutes);
    NEW.resolution_due_at = now() + make_interval(mins => p.resolution_minutes);
    IF NEW.due_at IS NULL THEN
      NEW.due_at = NEW.resolution_due_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cases_apply_sla_insert BEFORE INSERT ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.apply_case_sla();
CREATE TRIGGER cases_apply_sla_update BEFORE UPDATE OF priority, inbox_id ON public.cases
  FOR EACH ROW WHEN (OLD.priority IS DISTINCT FROM NEW.priority OR OLD.inbox_id IS DISTINCT FROM NEW.inbox_id)
  EXECUTE FUNCTION public.apply_case_sla();

-- Track status/owner/priority/due changes and stamp resolved/closed timestamps
CREATE OR REPLACE FUNCTION public.log_case_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  actor uuid := public.current_profile_id();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.case_events (organization_id, case_id, actor_id, event_type, to_value)
    VALUES (NEW.organization_id, NEW.id, COALESCE(NEW.created_by_id, actor), 'created', NEW.status);
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.case_events (organization_id, case_id, actor_id, event_type, from_value, to_value)
    VALUES (NEW.organization_id, NEW.id, actor, 'status_changed', OLD.status, NEW.status);
  END IF;
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
    INSERT INTO public.case_events (organization_id, case_id, actor_id, event_type, from_value, to_value)
    VALUES (NEW.organization_id, NEW.id, actor, 'owner_changed', OLD.owner_id::text, NEW.owner_id::text);
  END IF;
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.case_events (organization_id, case_id, actor_id, event_type, from_value, to_value)
    VALUES (NEW.organization_id, NEW.id, actor, 'priority_changed', OLD.priority, NEW.priority);
  END IF;
  IF OLD.due_at IS DISTINCT FROM NEW.due_at THEN
    INSERT INTO public.case_events (organization_id, case_id, actor_id, event_type, from_value, to_value)
    VALUES (NEW.organization_id, NEW.id, actor, 'due_changed', OLD.due_at::text, NEW.due_at::text);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.stamp_case_lifecycle()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'resolved' AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at = now();
  END IF;
  IF NEW.status = 'closed' AND NEW.closed_at IS NULL THEN
    NEW.closed_at = now();
    NEW.resolved_at = COALESCE(NEW.resolved_at, now());
  END IF;
  IF NEW.status NOT IN ('resolved','closed') THEN
    NEW.resolved_at = NULL;
    NEW.closed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cases_stamp_lifecycle BEFORE INSERT OR UPDATE OF status ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.stamp_case_lifecycle();
CREATE TRIGGER cases_log_changes AFTER INSERT OR UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.log_case_changes();

-- =========================================================
-- SEED DEFAULTS PER ORGANIZATION
-- =========================================================

INSERT INTO public.case_categories (organization_id, name, slug, sort_order)
SELECT o.id, x.name, x.slug, x.sort_order
FROM public.organizations o
CROSS JOIN (VALUES
  ('Booking',        'booking',        10),
  ('Billing',        'billing',        20),
  ('Delivery',       'delivery',       30),
  ('Product / Tires','product',        40),
  ('Complaint',      'complaint',      50),
  ('Technical',      'technical',      60),
  ('Other',          'other',          99)
) AS x(name, slug, sort_order)
ON CONFLICT DO NOTHING;

INSERT INTO public.case_resolution_codes (organization_id, name, slug, sort_order)
SELECT o.id, x.name, x.slug, x.sort_order
FROM public.organizations o
CROSS JOIN (VALUES
  ('Solved by support',      'solved_support',   10),
  ('Handed to service dept', 'handed_to_ops',    20),
  ('Refunded / compensated', 'refunded',         30),
  ('Customer withdrew',      'customer_withdrew',40),
  ('Duplicate',              'duplicate',        50),
  ('No response from customer','no_response',    60),
  ('Not our responsibility', 'out_of_scope',     70)
) AS x(name, slug, sort_order)
ON CONFLICT DO NOTHING;

INSERT INTO public.sla_policies (organization_id, inbox_id, priority, first_response_minutes, resolution_minutes)
SELECT o.id, NULL, x.priority, x.frt, x.res
FROM public.organizations o
CROSS JOIN (VALUES
  ('urgent', 30,  240),
  ('high',   60,  480),
  ('normal', 240, 1440),
  ('low',    480, 4320)
) AS x(priority, frt, res)
ON CONFLICT DO NOTHING;
