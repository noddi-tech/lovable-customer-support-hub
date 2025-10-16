-- Clean up orphaned organization and update correct organization slug

-- Step 1: Delete user_roles for profiles in orphaned organization
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT user_id FROM public.profiles
  WHERE organization_id = 'cc1fb3ed-b406-45c4-a9f3-c600335ecc18'
);

-- Step 2: Delete profiles in orphaned organization
DELETE FROM public.profiles
WHERE organization_id = 'cc1fb3ed-b406-45c4-a9f3-c600335ecc18';

-- Step 3: Delete the orphaned organization
DELETE FROM public.organizations
WHERE id = 'cc1fb3ed-b406-45c4-a9f3-c600335ecc18';

-- Step 4: Update the correct organization slug from 'demo' to 'noddi'
UPDATE public.organizations
SET slug = 'noddi', updated_at = now()
WHERE id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b';