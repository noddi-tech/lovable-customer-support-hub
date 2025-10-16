-- Add hidden field to calls table for soft delete functionality
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS hidden boolean DEFAULT false;

-- Add index for better query performance when filtering hidden calls
CREATE INDEX IF NOT EXISTS idx_calls_hidden ON public.calls(hidden) WHERE hidden = false;

-- Add comment explaining the field
COMMENT ON COLUMN public.calls.hidden IS 'Soft delete flag - when true, call is hidden from UI but preserved in database';