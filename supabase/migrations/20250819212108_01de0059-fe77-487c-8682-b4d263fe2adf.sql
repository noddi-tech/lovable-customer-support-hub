-- Add missing internal event types for call events
INSERT INTO public.internal_event_types (name, description, schema, is_active) 
VALUES 
  ('call_ended', 'Call has ended or been hung up', 
   '{
     "type": "object",
     "properties": {
       "hangup_cause": {"type": "string"},
       "call_duration": {"type": "number"},
       "ended_at": {"type": "number"}
     }
   }', true),
  ('call_started', 'Call has been initiated',
   '{
     "type": "object", 
     "properties": {
       "started_at": {"type": "number"}
     }
   }', true),
  ('call_answered', 'Call has been answered',
   '{
     "type": "object",
     "properties": {
       "answered_at": {"type": "number"}
     }
   }', true)
ON CONFLICT (name) DO NOTHING;

-- Now add webhook mappings for common call events
INSERT INTO public.webhook_event_mappings (
  provider,
  external_event,
  internal_event_type,
  condition_rules,
  data_mapping,
  is_active
) VALUES 
  ('aircall', 'call.hungup', 'call_ended', '{}', 
   '{
     "hangup_cause": "$.eventData.callData.hangup_cause",
     "call_duration": "$.eventData.callData.duration", 
     "ended_at": "$.eventData.callData.ended_at"
   }', true),
  ('aircall', 'call.ended', 'call_ended', '{}',
   '{
     "hangup_cause": "$.eventData.callData.hangup_cause", 
     "call_duration": "$.eventData.callData.duration",
     "ended_at": "$.eventData.callData.ended_at"
   }', true),
  ('aircall', 'call.answered', 'call_answered', '{}',
   '{
     "answered_at": "$.eventData.callData.answered_at"
   }', true)
ON CONFLICT (provider, external_event, internal_event_type) DO NOTHING;