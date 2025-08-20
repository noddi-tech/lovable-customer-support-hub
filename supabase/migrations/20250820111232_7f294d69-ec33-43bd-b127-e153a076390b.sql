-- Fix existing incorrect call events where voicemail_left was mapped as call_started
UPDATE call_events 
SET event_type = 'voicemail_left' 
WHERE event_type = 'call_started' 
  AND event_data->'webhookEvent' = '"call.voicemail_left"';