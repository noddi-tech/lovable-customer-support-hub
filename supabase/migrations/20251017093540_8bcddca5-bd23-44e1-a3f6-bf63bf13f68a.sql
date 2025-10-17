-- Fix ALL stuck calls from today that are still showing as "ringing" due to webhook failures
-- These calls should be marked as "missed" since they never progressed beyond ringing

UPDATE calls 
SET 
  status = 'missed',
  ended_at = started_at + interval '30 seconds',
  duration_seconds = 0,
  end_reason = 'webhook_failure_recovery',
  updated_at = now()
WHERE DATE(started_at) = CURRENT_DATE 
  AND status = 'ringing'
  AND organization_id = (SELECT id FROM organizations WHERE slug = 'noddi');