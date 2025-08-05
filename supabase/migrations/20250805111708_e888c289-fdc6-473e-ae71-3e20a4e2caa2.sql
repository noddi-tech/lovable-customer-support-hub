-- Fix admin role assignment with correct user ID
DELETE FROM public.user_roles WHERE user_id = '7e8f424e-5a2c-48ae-932c-39d5639b2d99';

INSERT INTO public.user_roles (user_id, role, created_by_id)
VALUES (
  'ffee179d-b9c9-428d-8ce9-8c8956e6af52', -- Correct user ID from the network request
  'admin',
  'ffee179d-b9c9-428d-8ce9-8c8956e6af52'
) ON CONFLICT (user_id, role) DO NOTHING;

-- Update primary role in profiles to admin for correct user
UPDATE public.profiles 
SET primary_role = 'admin'
WHERE user_id = 'ffee179d-b9c9-428d-8ce9-8c8956e6af52';