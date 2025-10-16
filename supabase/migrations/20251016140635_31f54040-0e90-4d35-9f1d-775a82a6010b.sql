-- Fix historical call data: Mark calls as 'missed' based on end_reason
UPDATE calls 
SET status = 'missed'
WHERE status = 'completed'
AND end_reason IN (
  'agents_did_not_answer',
  'abandoned_in_ivr',
  'not_answered', 
  'short_abandoned',
  'no_available_agent',
  'abandoned_in_classic',
  'out_of_opening_hours'
);