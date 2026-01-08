-- Add permissions for agent role
-- Agents need to be able to view conversations and handle emails
INSERT INTO public.role_permissions (role, permission) VALUES
  ('agent', 'view_all_conversations'),
  ('agent', 'send_emails'),
  ('agent', 'receive_emails')
ON CONFLICT DO NOTHING;

-- Fix Bob Vu's organization membership role from 'user' to 'agent'
UPDATE public.organization_memberships 
SET role = 'agent', updated_at = NOW()
WHERE user_id = 'add69db4-3ef3-4d80-a36b-15693d98cafa'
  AND organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b'
  AND role = 'user';

-- Sync profiles.role for consistency
UPDATE public.profiles 
SET role = 'agent', primary_role = 'agent', updated_at = NOW()
WHERE user_id = 'add69db4-3ef3-4d80-a36b-15693d98cafa'
  AND role = 'user';

-- Remove redundant 'user' role from user_roles since 'agent' encompasses it
DELETE FROM public.user_roles 
WHERE user_id = 'add69db4-3ef3-4d80-a36b-15693d98cafa' 
  AND role = 'user';