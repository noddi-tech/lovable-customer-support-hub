-- Add time format preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN time_format TEXT DEFAULT '12h' CHECK (time_format IN ('12h', '24h'));