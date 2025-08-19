-- Fix the foreign key constraint for assigned_to_id
-- First, drop the existing foreign key constraint to auth.users
ALTER TABLE public.internal_events 
DROP CONSTRAINT IF EXISTS internal_events_assigned_to_id_fkey;

-- Add the correct foreign key constraint to profiles.user_id
ALTER TABLE public.internal_events 
ADD CONSTRAINT internal_events_assigned_to_id_fkey 
FOREIGN KEY (assigned_to_id) REFERENCES public.profiles(user_id);