
-- Feedback table for thumbs up/down on AI messages
CREATE TABLE public.widget_ai_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.widget_ai_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.widget_ai_conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.widget_ai_feedback ENABLE ROW LEVEL SECURITY;

-- Public insert policy (widget visitors can submit feedback)
CREATE POLICY "Anyone can submit AI feedback" ON public.widget_ai_feedback
  FOR INSERT WITH CHECK (true);

-- Org members can read feedback
CREATE POLICY "Org members can read AI feedback" ON public.widget_ai_feedback
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Add feedback_rating column to widget_ai_messages for quick lookups
ALTER TABLE public.widget_ai_messages 
  ADD COLUMN IF NOT EXISTS feedback_rating TEXT CHECK (feedback_rating IN ('positive', 'negative', NULL));

-- Add resolved_by_ai column to conversations for tracking AI resolution
ALTER TABLE public.widget_ai_conversations
  ADD COLUMN IF NOT EXISTS resolved_by_ai BOOLEAN DEFAULT false;

-- Add intent tracking
ALTER TABLE public.widget_ai_conversations
  ADD COLUMN IF NOT EXISTS primary_intent TEXT;

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_ai_feedback_org_created ON public.widget_ai_feedback(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_org_created ON public.widget_ai_conversations(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.widget_ai_messages(conversation_id, created_at);
