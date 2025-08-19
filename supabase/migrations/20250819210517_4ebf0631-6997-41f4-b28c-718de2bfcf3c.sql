-- Fix incorrect event_type mappings in existing call_events
-- Update events based on their webhookEvent in event_data

-- Fix call.ended events that were incorrectly mapped to call_started
UPDATE public.call_events 
SET event_type = 'call_ended'
WHERE event_type = 'call_started' 
  AND event_data->>'webhookEvent' = 'call.ended';

-- Fix call.hungup events that should be call_ended
UPDATE public.call_events 
SET event_type = 'call_ended'
WHERE event_type = 'call_started' 
  AND event_data->>'webhookEvent' = 'call.hungup';

-- Fix call.ivr_option_selected events that were incorrectly mapped to call_started  
UPDATE public.call_events 
SET event_type = 'dtmf_pressed'
WHERE event_type = 'call_started' 
  AND event_data->>'webhookEvent' = 'call.ivr_option_selected';

-- Update any other incorrectly mapped events based on webhook event type
UPDATE public.call_events 
SET event_type = CASE 
  WHEN event_data->>'webhookEvent' = 'call.answered' THEN 'call_answered'
  WHEN event_data->>'webhookEvent' = 'call.missed' THEN 'call_missed' 
  WHEN event_data->>'webhookEvent' = 'call.transferred' THEN 'call_transferred'
  WHEN event_data->>'webhookEvent' = 'call.hold' THEN 'call_on_hold'
  WHEN event_data->>'webhookEvent' = 'call.unhold' THEN 'call_resumed'
  WHEN event_data->>'webhookEvent' = 'call.voicemail' THEN 'voicemail_left'
  ELSE event_type  -- Keep existing if no match
END
WHERE event_type = 'call_started'  -- Only fix the incorrectly defaulted ones
  AND event_data->>'webhookEvent' IN (
    'call.answered', 'call.missed', 'call.transferred', 
    'call.hold', 'call.unhold', 'call.voicemail'
  );