
-- Create ai_action_flows table
CREATE TABLE public.ai_action_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  widget_config_id UUID NOT NULL REFERENCES public.widget_configs(id) ON DELETE CASCADE,
  intent_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  trigger_phrases TEXT[] DEFAULT '{}',
  requires_verification BOOLEAN NOT NULL DEFAULT true,
  flow_steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(widget_config_id, intent_key)
);

-- Add ai_general_config column to widget_configs
ALTER TABLE public.widget_configs
  ADD COLUMN IF NOT EXISTS ai_general_config JSONB DEFAULT '{"tone": "friendly, concise, helpful", "max_initial_lines": 4, "never_dump_history": true, "language_behavior": "Match the customer''s language. Default to Norwegian (bokmål).", "escalation_threshold": 3}';

-- Enable RLS
ALTER TABLE public.ai_action_flows ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view action flows for their organization"
  ON public.ai_action_flows FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create action flows for their organization"
  ON public.ai_action_flows FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update action flows for their organization"
  ON public.ai_action_flows FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete action flows for their organization"
  ON public.ai_action_flows FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  ));

-- Service role access for edge functions
CREATE POLICY "Service role full access to ai_action_flows"
  ON public.ai_action_flows FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_ai_action_flows_updated_at
  BEFORE UPDATE ON public.ai_action_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_ai_action_flows_widget ON public.ai_action_flows(widget_config_id, is_active);
