-- Update the user's profile to have admin role
UPDATE public.profiles 
SET primary_role = 'admin', role = 'admin' 
WHERE user_id = 'ffee179d-b9c9-428d-8ce9-8c8956e6af52';

-- Insert admin role into user_roles table to enable permissions system
INSERT INTO public.user_roles (user_id, role, created_by_id)
VALUES ('ffee179d-b9c9-428d-8ce9-8c8956e6af52', 'admin', 'ffee179d-b9c9-428d-8ce9-8c8956e6af52')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure there's an admin role for the other admin user if they exist
UPDATE public.profiles 
SET primary_role = 'admin', role = 'admin' 
WHERE user_id = '7e8f424e-5a2c-48ae-932c-39d5639b2d99';

INSERT INTO public.user_roles (user_id, role, created_by_id)
VALUES ('7e8f424e-5a2c-48ae-932c-39d5639b2d99', 'admin', '7e8f424e-5a2c-48ae-932c-39d5639b2d99')
ON CONFLICT (user_id, role) DO NOTHING;