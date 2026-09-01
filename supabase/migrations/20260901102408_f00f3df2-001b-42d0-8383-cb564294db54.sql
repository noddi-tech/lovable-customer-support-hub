UPDATE public.organization_memberships
SET role = 'admin', updated_at = now()
WHERE user_id = 'e54363da-ea69-4a2f-9cfe-159e69933466'
  AND organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b';

INSERT INTO public.user_roles (user_id, role)
SELECT 'e54363da-ea69-4a2f-9cfe-159e69933466', 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = 'e54363da-ea69-4a2f-9cfe-159e69933466' AND role = 'admin'::app_role
);