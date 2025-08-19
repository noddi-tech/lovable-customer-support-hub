-- Fix the foreign key relationship for call notes to profiles
-- First, let's add a proper foreign key constraint to link created_by_id to profiles
ALTER TABLE public.call_notes 
ADD CONSTRAINT call_notes_created_by_id_profiles_fkey 
FOREIGN KEY (created_by_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;