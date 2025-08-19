-- Fix the webhook mapping for voicemail - the recording URL is directly in voicemail field, not nested
UPDATE public.webhook_event_mappings 
SET data_mapping = '{
  "recording_url": "$.eventData.callData.voicemail",
  "duration": "$.eventData.callData.duration",
  "call_uuid": "$.eventData.callData.call_uuid"
}'
WHERE provider = 'aircall' 
  AND external_event = 'call.voicemail' 
  AND internal_event_type = 'voicemail_left';