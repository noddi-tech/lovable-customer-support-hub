-- Fix stuck calls that are still showing as "ringing" due to webhook failures
-- These calls should be marked as "missed" since they never progressed

-- Update today's stuck call (2025-10-17)
UPDATE calls 
SET 
  status = 'missed',
  ended_at = started_at + interval '30 seconds',
  duration_seconds = 0,
  end_reason = 'webhook_failure_recovery',
  updated_at = now()
WHERE id = '1e8f8ef5-1b97-46e0-b854-0deda25b9971'
  AND status = 'ringing';

-- Update the 2-month-old stuck call (2025-08-20)
UPDATE calls 
SET 
  status = 'missed',
  ended_at = started_at + interval '30 seconds',
  duration_seconds = 0,
  end_reason = 'webhook_failure_recovery',
  updated_at = now()
WHERE id = '38c36544-a3e4-4b98-b808-3010e2669126'
  AND status = 'ringing';

-- Log the cleanup for debugging
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % stuck calls', updated_count;
END $$;