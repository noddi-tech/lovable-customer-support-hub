-- Fix webhook event mapping for voicemail events
UPDATE webhook_event_mappings 
SET external_event = 'call.voicemail_left' 
WHERE external_event = 'call.voicemail' 
AND provider = 'aircall' 
AND internal_event_type = 'voicemail_left';