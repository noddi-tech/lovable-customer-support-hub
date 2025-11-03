-- Add super_admin role to joachim@noddi.no
INSERT INTO public.user_roles (user_id, role, created_by_id)
VALUES ('7e8f424e-5a2c-48ae-932c-39d5639b2d99', 'super_admin', '7e8f424e-5a2c-48ae-932c-39d5639b2d99')
ON CONFLICT (user_id, role) DO NOTHING;