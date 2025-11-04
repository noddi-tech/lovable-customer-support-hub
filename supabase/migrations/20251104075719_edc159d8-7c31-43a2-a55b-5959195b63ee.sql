-- Drop the constraint if it exists (from partial migration)
ALTER TABLE public.organization_memberships
DROP CONSTRAINT IF EXISTS organization_memberships_user_id_fkey;

ALTER TABLE public.organization_memberships
DROP CONSTRAINT IF EXISTS organization_memberships_organization_id_fkey;

-- Add foreign key from organization_memberships.user_id to auth.users.id
-- This enables PostgREST to understand the relationship and perform nested queries
ALTER TABLE public.organization_memberships
ADD CONSTRAINT organization_memberships_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Add foreign key from organization_memberships.organization_id to organizations.id
-- This ensures referential integrity with organizations
ALTER TABLE public.organization_memberships
ADD CONSTRAINT organization_memberships_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES public.organizations(id)
ON DELETE CASCADE;