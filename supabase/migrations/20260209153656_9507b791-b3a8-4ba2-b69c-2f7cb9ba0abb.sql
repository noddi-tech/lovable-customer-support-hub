-- Add knowledge_gaps table to track questions the AI couldn't answer
CREATE TABLE public.knowledge_gaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.widget_ai_conversations(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by_entry_id UUID REFERENCES public.knowledge_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view knowledge gaps"
  ON public.knowledge_gaps FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Org members can manage knowledge gaps"
  ON public.knowledge_gaps FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE INDEX idx_knowledge_gaps_org_status ON public.knowledge_gaps(organization_id, status);

-- Add summary column to widget_ai_conversations for quick browsing
ALTER TABLE public.widget_ai_conversations ADD COLUMN IF NOT EXISTS summary TEXT;
