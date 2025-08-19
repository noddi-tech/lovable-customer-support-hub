-- Create enum for call status
CREATE TYPE call_status AS ENUM ('ringing', 'answered', 'missed', 'busy', 'failed', 'completed', 'transferred', 'on_hold', 'voicemail');

-- Create enum for call direction  
CREATE TYPE call_direction AS ENUM ('inbound', 'outbound');

-- Create enum for call event types
CREATE TYPE call_event_type AS ENUM (
  'call_started', 'call_answered', 'call_ended', 'call_missed', 
  'call_transferred', 'call_on_hold', 'call_resumed', 'voicemail_left',
  'dtmf_pressed', 'callback_requested', 'agent_assigned'
);

-- Create calls table
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  external_id TEXT NOT NULL, -- Provider's call ID (Aircall, etc)
  provider TEXT NOT NULL DEFAULT 'aircall',
  customer_phone TEXT,
  agent_phone TEXT,
  status call_status NOT NULL DEFAULT 'ringing',
  direction call_direction NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  recording_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_external_call UNIQUE (provider, external_id)
);

-- Create call_events table for granular event tracking
CREATE TABLE public.call_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  event_type call_event_type NOT NULL,
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add call_id reference to conversations table
ALTER TABLE public.conversations ADD COLUMN call_id UUID REFERENCES public.calls(id);

-- Enable RLS on new tables
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calls table
CREATE POLICY "Users can view calls in their organization"
  ON public.calls FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert calls in their organization"
  ON public.calls FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update calls in their organization"
  ON public.calls FOR UPDATE
  USING (organization_id = get_user_organization_id());

-- Create RLS policies for call_events table
CREATE POLICY "Users can view call events in their organization"
  ON public.call_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.calls c 
    WHERE c.id = call_events.call_id 
    AND c.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Users can insert call events in their organization"
  ON public.call_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calls c 
    WHERE c.id = call_events.call_id 
    AND c.organization_id = get_user_organization_id()
  ));

-- Create indexes for performance
CREATE INDEX idx_calls_organization_id ON public.calls(organization_id);
CREATE INDEX idx_calls_status ON public.calls(status);
CREATE INDEX idx_calls_started_at ON public.calls(started_at DESC);
CREATE INDEX idx_calls_external_id ON public.calls(provider, external_id);
CREATE INDEX idx_call_events_call_id ON public.call_events(call_id);
CREATE INDEX idx_call_events_timestamp ON public.call_events(timestamp DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_calls_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_events;