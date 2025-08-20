-- Mark old voicemail as expired since external URL is no longer accessible
UPDATE internal_events 
SET 
  status = 'expired',
  event_data = event_data || '{"status": "expired", "reason": "External recording URL expired, no local storage available"}'::jsonb,
  updated_at = now()
WHERE id = '6e119488-0824-468a-bf30-4b48230ebb30';