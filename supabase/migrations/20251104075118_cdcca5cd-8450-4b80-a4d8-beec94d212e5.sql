-- Add foreign key constraint from profiles.user_id to auth.users.id
-- This enables PostgREST to understand the relationship for nested queries
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;