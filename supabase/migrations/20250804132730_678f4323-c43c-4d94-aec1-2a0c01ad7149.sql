-- Check if the user exists in auth.users and create profile if missing
INSERT INTO public.profiles (user_id, email, full_name, organization_id, role, is_active)
SELECT 
  '7e8f424e-5a2c-48ae-932c-39d5639b2d99',
  'joachim@noddi.no',
  'Joachim Rathke',
  'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b',
  'agent',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = '7e8f424e-5a2c-48ae-932c-39d5639b2d99'
);