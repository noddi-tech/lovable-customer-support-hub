-- Add metadata column to organizations table to store additional settings
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;