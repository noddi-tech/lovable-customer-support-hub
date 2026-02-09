-- AI Conversation persistence tables

-- Table to track AI chat conversations
CREATE TABLE public.widget_ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  widget_config_id UUID REFERENCES public.widget_configs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  visitor_id TEXT,
  visitor_phone TEXT,
  visitor_email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'escalated')),
  resolved_by TEXT CHECK (resolved_by IN ('ai', 'agent', 'email', NULL)),
  escalated_at TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,
  tools_used TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Table to track individual messages in AI conversations
CREATE TABLE public.widget_ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.widget_ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  intent_detected TEXT,
  tools_used TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_widget_ai_conversations_org ON public.widget_ai_conversations(organization_id);
CREATE INDEX idx_widget_ai_conversations_status ON public.widget_ai_conversations(status);
CREATE INDEX idx_widget_ai_conversations_created ON public.widget_ai_conversations(created_at DESC);
CREATE INDEX idx_widget_ai_messages_conversation ON public.widget_ai_messages(conversation_id);
CREATE INDEX idx_widget_ai_messages_created ON public.widget_ai_messages(created_at);

-- Enable RLS
ALTER TABLE public.widget_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Edge functions use service role key, so these policies are for admin dashboard access
CREATE POLICY "Org members can view AI conversations"
  ON public.widget_ai_conversations FOR SELECT
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  ));

CREATE POLICY "Org members can view AI messages"
  ON public.widget_ai_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM public.widget_ai_conversations
    WHERE organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  ));

-- Trigger to update updated_at
CREATE TRIGGER update_widget_ai_conversations_updated_at
  BEFORE UPDATE ON public.widget_ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_session_updated_at();