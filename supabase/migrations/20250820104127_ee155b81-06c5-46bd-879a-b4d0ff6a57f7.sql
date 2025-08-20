-- Update the old voicemail status to 'closed' so it appears in the Closed section
UPDATE internal_events 
SET 
  status = 'closed',
  updated_at = now()
WHERE id = '6e119488-0824-468a-bf30-4b48230ebb30';