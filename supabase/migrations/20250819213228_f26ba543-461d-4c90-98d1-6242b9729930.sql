-- Create internal event for the existing voicemail from the recent call
-- First, get the call_id for the recent voicemail call
WITH recent_voicemail_call AS (
  SELECT id, organization_id 
  FROM calls 
  WHERE customer_phone = '+47 95 84 33 36' 
    AND external_id = '3048615688'
  LIMIT 1
)
INSERT INTO public.internal_events (
  organization_id,
  event_type,
  call_id,
  customer_phone,
  event_data,
  status,
  created_at
)
SELECT 
  rvc.organization_id,
  'voicemail_left',
  rvc.id,
  '+47 95 84 33 36',
  '{
    "recording_url": "https://production-fra-555773567328-web-recordings.s3.eu-central-1.amazonaws.com/companies/407991/voicemails/2025/08/19/1755638890000-CA38ced1de5840af52131a253706cba7d0-RE0b33baff1a7e1f4deb1666eb6d2d2394.mp3",
    "duration": 21,
    "call_uuid": "CA38ced1de5840af52131a253706cba7d0"
  }'::jsonb,
  'pending',
  '2025-08-19T21:28:54.559110Z'
FROM recent_voicemail_call rvc;