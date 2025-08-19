-- Add webhook mapping for call.hungup event
INSERT INTO public.webhook_event_mappings (
  provider,
  external_event,
  internal_event_type,
  condition_rules,
  data_mapping,
  is_active
) VALUES (
  'aircall',
  'call.hungup',
  'call_ended',
  '{}',
  '{
    "hangup_cause": "$.eventData.callData.hangup_cause",
    "call_duration": "$.eventData.callData.duration", 
    "ended_at": "$.eventData.callData.ended_at"
  }',
  true
);