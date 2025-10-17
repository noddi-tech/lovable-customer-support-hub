-- Fix stuck call for Alexander Bromnes
UPDATE calls
SET 
  status = 'missed',
  ended_at = started_at + interval '8 hours',
  end_reason = 'not_answered',
  updated_at = now()
WHERE id = 'd40f35fc-bf2b-42c6-b057-d47d937a39a7'
  AND status = 'ringing'
  AND ended_at IS NULL;