-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: knowledge_entries
-- Stores validated, high-quality responses that can be reused
CREATE TABLE public.knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Content fields
  customer_context TEXT NOT NULL, -- What the customer said/asked
  agent_response TEXT NOT NULL, -- The successful agent response
  category TEXT, -- Optional categorization (e.g., 'billing', 'technical')
  tags TEXT[], -- Searchable tags
  
  -- Quality metrics
  quality_score NUMERIC DEFAULT 0, -- Calculated quality score (0-100)
  usage_count INTEGER DEFAULT 0, -- How many times this was suggested
  acceptance_count INTEGER DEFAULT 0, -- How many times agents used it
  
  -- Semantic search
  embedding vector(1536), -- OpenAI embedding for similarity search
  
  -- Metadata
  created_from_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  is_manually_curated BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: response_tracking
-- Tracks every agent reply and its origin (manual vs AI-suggested)
CREATE TABLE public.response_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- References
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Origin tracking
  response_source TEXT NOT NULL CHECK (response_source IN ('manual', 'ai_suggestion', 'template', 'knowledge_base')),
  ai_suggestion_id TEXT, -- If from AI, which suggestion was selected
  knowledge_entry_id UUID REFERENCES public.knowledge_entries(id) ON DELETE SET NULL,
  
  -- Context capture
  customer_message TEXT, -- The message being replied to
  agent_response TEXT NOT NULL, -- The actual response sent
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: response_outcomes
-- Tracks the effectiveness of responses
CREATE TABLE public.response_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- References
  response_tracking_id UUID NOT NULL REFERENCES public.response_tracking(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  
  -- Outcome metrics
  customer_replied BOOLEAN DEFAULT false,
  reply_time_seconds INTEGER, -- Time until customer replied
  conversation_resolved BOOLEAN DEFAULT false,
  customer_satisfaction_score INTEGER, -- 1-5 if available
  required_followup BOOLEAN DEFAULT false, -- Did it need clarification?
  
  -- Auto-calculated
  outcome_score NUMERIC, -- Calculated score (0-100)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_knowledge_entries_org ON public.knowledge_entries(organization_id);
CREATE INDEX idx_knowledge_entries_quality ON public.knowledge_entries(quality_score DESC) WHERE is_active = true;
CREATE INDEX idx_knowledge_entries_category ON public.knowledge_entries(category) WHERE is_active = true;
CREATE INDEX idx_knowledge_entries_tags ON public.knowledge_entries USING GIN(tags);

CREATE INDEX idx_response_tracking_org ON public.response_tracking(organization_id);
CREATE INDEX idx_response_tracking_conversation ON public.response_tracking(conversation_id);
CREATE INDEX idx_response_tracking_agent ON public.response_tracking(agent_id);
CREATE INDEX idx_response_tracking_source ON public.response_tracking(response_source);
CREATE INDEX idx_response_tracking_created ON public.response_tracking(created_at DESC);

CREATE INDEX idx_response_outcomes_tracking ON public.response_outcomes(response_tracking_id);
CREATE INDEX idx_response_outcomes_conversation ON public.response_outcomes(conversation_id);

-- RLS Policies for knowledge_entries
ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view knowledge entries in their organization"
  ON public.knowledge_entries FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert knowledge entries in their organization"
  ON public.knowledge_entries FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update knowledge entries in their organization"
  ON public.knowledge_entries FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can delete knowledge entries"
  ON public.knowledge_entries FOR DELETE
  USING (
    organization_id = public.get_user_organization_id() 
    AND public.has_permission(auth.uid(), 'manage_settings'::app_permission)
  );

-- RLS Policies for response_tracking
ALTER TABLE public.response_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view response tracking in their organization"
  ON public.response_tracking FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert response tracking in their organization"
  ON public.response_tracking FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id() AND agent_id = auth.uid());

CREATE POLICY "Admins can update response tracking"
  ON public.response_tracking FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id() 
    AND public.has_permission(auth.uid(), 'manage_settings'::app_permission)
  );

-- RLS Policies for response_outcomes
ALTER TABLE public.response_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view response outcomes in their organization"
  ON public.response_outcomes FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "System can insert response outcomes"
  ON public.response_outcomes FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "System can update response outcomes"
  ON public.response_outcomes FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

-- Trigger to update updated_at columns
CREATE TRIGGER update_knowledge_entries_updated_at
  BEFORE UPDATE ON public.knowledge_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_response_outcomes_updated_at
  BEFORE UPDATE ON public.response_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to find similar knowledge entries using vector similarity
CREATE OR REPLACE FUNCTION public.find_similar_responses(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  org_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  customer_context text,
  agent_response text,
  quality_score numeric,
  similarity float,
  category text,
  tags text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ke.id,
    ke.customer_context,
    ke.agent_response,
    ke.quality_score,
    1 - (ke.embedding <=> query_embedding) as similarity,
    ke.category,
    ke.tags
  FROM public.knowledge_entries ke
  WHERE ke.is_active = true
    AND ke.embedding IS NOT NULL
    AND ke.organization_id = COALESCE(org_id, public.get_user_organization_id())
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;