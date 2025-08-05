-- Assign admin role to user
INSERT INTO public.user_roles (user_id, role, created_by_id)
VALUES (
  '7e8f424e-5a2c-48ae-932c-39d5639b2d99', -- Your user ID
  'admin',
  '7e8f424e-5a2c-48ae-932c-39d5639b2d99'  -- Created by yourself
) ON CONFLICT (user_id, role) DO NOTHING;

-- Update primary role in profiles to admin
UPDATE public.profiles 
SET primary_role = 'admin'
WHERE user_id = '7e8f424e-5a2c-48ae-932c-39d5639b2d99';