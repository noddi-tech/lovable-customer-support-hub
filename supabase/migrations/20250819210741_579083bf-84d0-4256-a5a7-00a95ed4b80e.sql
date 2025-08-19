-- Fix call statuses for existing calls that should be completed
-- Update calls that have ended_at timestamp but still show as 'ringing'

UPDATE public.calls 
SET status = 'completed'
WHERE status = 'ringing' 
  AND ended_at IS NOT NULL 
  AND duration_seconds IS NOT NULL 
  AND duration_seconds > 0;