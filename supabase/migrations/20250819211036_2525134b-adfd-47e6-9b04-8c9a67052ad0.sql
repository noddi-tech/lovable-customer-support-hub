-- Create internal event system for business events like callback requests

-- 1. Internal Event Types (business events like callback_requested, escalation_needed)
CREATE TABLE public.internal_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  schema jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Webhook Event Mappings (configure which external events trigger internal events)
CREATE TABLE public.webhook_event_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, -- 'aircall', 'twilio', etc
  external_event text NOT NULL, -- 'call.ivr_option_selected'
  internal_event_type text NOT NULL REFERENCES internal_event_types(name),
  condition_rules jsonb DEFAULT '{}', -- what conditions must be met
  data_mapping jsonb DEFAULT '{}', -- how to extract/transform data
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider, external_event, internal_event_type)
);

-- 3. Internal Events Log (actual business events that occurred)
CREATE TABLE public.internal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  event_type text NOT NULL REFERENCES internal_event_types(name),
  call_id uuid REFERENCES calls(id),
  conversation_id uuid REFERENCES conversations(id),
  customer_phone text,
  event_data jsonb DEFAULT '{}',
  triggered_by_event_id uuid REFERENCES call_events(id), -- audit trail
  status text DEFAULT 'pending', -- pending, processed, failed
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.internal_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_event_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for internal_event_types (admin can manage, all can view)
CREATE POLICY "Users can view event types" 
ON public.internal_event_types FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage event types"
ON public.internal_event_types FOR ALL
USING (has_permission(auth.uid(), 'manage_settings'::app_permission));

-- RLS Policies for webhook_event_mappings (admin can manage, all can view)
CREATE POLICY "Users can view webhook mappings" 
ON public.webhook_event_mappings FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage webhook mappings"
ON public.webhook_event_mappings FOR ALL
USING (has_permission(auth.uid(), 'manage_settings'::app_permission));

-- RLS Policies for internal_events (organization-scoped)
CREATE POLICY "Users can view internal events in their organization"
ON public.internal_events FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create internal events in their organization"
ON public.internal_events FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update internal events in their organization"
ON public.internal_events FOR UPDATE
USING (organization_id = get_user_organization_id());

-- Create indexes for performance
CREATE INDEX idx_internal_events_organization_type ON public.internal_events(organization_id, event_type);
CREATE INDEX idx_internal_events_call_id ON public.internal_events(call_id);
CREATE INDEX idx_internal_events_status ON public.internal_events(status);
CREATE INDEX idx_webhook_mappings_provider_event ON public.webhook_event_mappings(provider, external_event);

-- Insert initial event types
INSERT INTO public.internal_event_types (name, description, schema) VALUES
('callback_requested', 'Customer requested a callback through IVR or other channel', '{
  "type": "object",
  "properties": {
    "customer_phone": {"type": "string"},
    "callback_reason": {"type": "string"},
    "priority": {"type": "string", "enum": ["low", "normal", "high", "urgent"]},
    "preferred_time": {"type": "string"},
    "ivr_selection": {"type": "object"}
  },
  "required": ["customer_phone"]
}'),
('escalation_requested', 'Call was escalated to supervisor or higher tier', '{
  "type": "object", 
  "properties": {
    "escalation_reason": {"type": "string"},
    "escalated_by": {"type": "string"},
    "priority": {"type": "string", "enum": ["normal", "high", "urgent"]}
  }
}'),
('voicemail_left', 'Customer left a voicemail message', '{
  "type": "object",
  "properties": {
    "voicemail_url": {"type": "string"},
    "transcription": {"type": "string"},
    "duration_seconds": {"type": "number"}
  }
}');

-- Insert initial webhook mapping for Aircall callback requests
INSERT INTO public.webhook_event_mappings (
  provider, 
  external_event, 
  internal_event_type, 
  condition_rules, 
  data_mapping
) VALUES (
  'aircall',
  'call.ivr_option_selected',
  'callback_requested',
  '{
    "ivr_options": {
      "branch": "Want_callback"
    }
  }',
  '{
    "customer_phone": "$.callData.raw_digits",
    "callback_reason": "$.callData.ivr_options[0].title", 
    "priority": "normal",
    "ivr_selection": "$.callData.ivr_options[0]"
  }'
);

-- Add triggers for updated_at
CREATE TRIGGER update_internal_event_types_updated_at
  BEFORE UPDATE ON public.internal_event_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_event_mappings_updated_at
  BEFORE UPDATE ON public.webhook_event_mappings  
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_internal_events_updated_at
  BEFORE UPDATE ON public.internal_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();