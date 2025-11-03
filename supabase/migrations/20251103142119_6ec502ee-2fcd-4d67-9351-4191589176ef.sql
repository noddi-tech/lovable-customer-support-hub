-- Step 2: Assign permissions to super_admin
INSERT INTO public.role_permissions (role, permission) VALUES
  ('super_admin', 'view_all_organizations'),
  ('super_admin', 'manage_organizations'),
  ('super_admin', 'view_system_logs'),
  ('super_admin', 'manage_system_settings'),
  ('super_admin', 'manage_users'),
  ('super_admin', 'manage_departments'),
  ('super_admin', 'manage_inboxes'),
  ('super_admin', 'manage_settings'),
  ('super_admin', 'view_all_conversations'),
  ('super_admin', 'send_emails'),
  ('super_admin', 'receive_emails')
ON CONFLICT (role, permission) DO NOTHING;

-- Step 3: Create organization_memberships table
CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  is_default BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'invited')),
  invited_by_id UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_memberships_user_default ON public.organization_memberships(user_id) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON public.organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON public.organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_status ON public.organization_memberships(status);

ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

-- Step 4: Create helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_memberships()
RETURNS TABLE (membership_id UUID, organization_id UUID, organization_name TEXT, organization_slug TEXT, role public.app_role, is_default BOOLEAN, status TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.id, om.organization_id, o.name, o.slug, om.role, om.is_default, om.status
  FROM public.organization_memberships om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = auth.uid() AND om.status = 'active'
  ORDER BY om.is_default DESC, o.name ASC;
$$;

-- Step 5: Migrate existing data
INSERT INTO public.organization_memberships (user_id, organization_id, role, is_default, status, joined_at)
SELECT p.user_id, p.organization_id, COALESCE(p.primary_role, 'user'::public.app_role), true, 'active', p.created_at
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.organization_memberships om WHERE om.user_id = p.user_id AND om.organization_id = p.organization_id)
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Step 6: Make profiles.organization_id nullable
ALTER TABLE public.profiles ALTER COLUMN organization_id DROP NOT NULL;

-- Step 7: Assign super admin
INSERT INTO public.user_roles (user_id, role, created_by_id)
VALUES ('ffee179d-b9c9-428d-8ce9-8c8956e6af52', 'super_admin', 'ffee179d-b9c9-428d-8ce9-8c8956e6af52')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles SET primary_role = 'super_admin' WHERE user_id = 'ffee179d-b9c9-428d-8ce9-8c8956e6af52';

INSERT INTO public.organization_memberships (user_id, organization_id, role, is_default, status)
SELECT 'ffee179d-b9c9-428d-8ce9-8c8956e6af52', o.id, 'super_admin'::public.app_role, (o.slug = 'noddi'), 'active'
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.organization_memberships WHERE user_id = 'ffee179d-b9c9-428d-8ce9-8c8956e6af52' AND organization_id = o.id)
ON CONFLICT (user_id, organization_id) DO NOTHING;