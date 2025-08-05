-- Add metadata column to organizations table to store additional settings
ALTER TABLE public.organizations 
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;