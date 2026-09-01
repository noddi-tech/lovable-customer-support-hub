CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  value_type text NOT NULL DEFAULT 'boolean' CHECK (value_type IN ('boolean','string','number','json')),
  variants jsonb NOT NULL DEFAULT '{"on": true, "off": false}'::jsonb,
  default_variant text NOT NULL DEFAULT 'off',
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_org_key_uniq
  ON public.feature_flags (organization_id, key)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_global_key_uniq
  ON public.feature_flags (key)
  WHERE organization_id IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read org and global flags" ON public.feature_flags;
CREATE POLICY "Members can read org and global flags"
ON public.feature_flags FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Org admins manage org flags" ON public.feature_flags;
CREATE POLICY "Org admins manage org flags"
ON public.feature_flags FOR ALL TO authenticated
USING (
  (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  OR public.is_super_admin()
)
WITH CHECK (
  (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  OR public.is_super_admin()
);

CREATE OR REPLACE FUNCTION public.feature_flags_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.feature_flags_set_updated_at();