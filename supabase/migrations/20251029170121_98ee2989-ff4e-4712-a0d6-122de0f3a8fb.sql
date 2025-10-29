-- Add refinement tracking columns to response_tracking
ALTER TABLE public.response_tracking
ADD COLUMN IF NOT EXISTS original_ai_suggestion TEXT,
ADD COLUMN IF NOT EXISTS refinement_instructions TEXT,
ADD COLUMN IF NOT EXISTS was_refined BOOLEAN DEFAULT false;

-- Index for querying refined responses (valuable training data)
CREATE INDEX IF NOT EXISTS idx_response_tracking_refined 
ON public.response_tracking(was_refined, created_at)
WHERE was_refined = true;

-- Create knowledge_patterns table for learning insights
CREATE TABLE IF NOT EXISTS public.knowledge_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Pattern tracking
  pattern_type TEXT NOT NULL, -- 'refinement', 'template', 'topic'
  pattern_key TEXT NOT NULL,   -- e.g., "add_discount", "mention_timeline"
  pattern_description TEXT,
  occurrence_count INTEGER DEFAULT 1,
  
  -- Learning data
  example_refinements TEXT[], -- Sample refinement instructions
  success_rate NUMERIC DEFAULT 0,  -- How often this pattern leads to good outcomes
  
  -- Metadata
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, pattern_key)
);

-- Index for pattern lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_patterns_org_type 
ON public.knowledge_patterns(organization_id, pattern_type);

-- RLS policies for knowledge_patterns
ALTER TABLE public.knowledge_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view patterns in their organization"
ON public.knowledge_patterns FOR SELECT
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "System can insert patterns"
ON public.knowledge_patterns FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "System can update patterns"
ON public.knowledge_patterns FOR UPDATE
USING (organization_id = public.get_user_organization_id());

-- Function to find similar responses including refined ones
CREATE OR REPLACE FUNCTION public.find_similar_responses(
  query_embedding vector(1536),
  org_id UUID,
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  customer_context TEXT,
  agent_response TEXT,
  quality_score NUMERIC,
  usage_count INTEGER,
  was_refined BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ke.id,
    ke.customer_context,
    ke.agent_response,
    ke.quality_score,
    ke.usage_count,
    COALESCE(
      (SELECT rt.was_refined 
       FROM public.response_tracking rt 
       WHERE rt.knowledge_entry_id = ke.id 
       LIMIT 1),
      false
    ) as was_refined
  FROM public.knowledge_entries ke
  WHERE ke.organization_id = org_id
    AND ke.is_active = true
    AND (1 - (ke.embedding <=> query_embedding)) > match_threshold
  ORDER BY 
    -- Prioritize refined responses
    CASE WHEN COALESCE(
      (SELECT rt.was_refined 
       FROM public.response_tracking rt 
       WHERE rt.knowledge_entry_id = ke.id 
       LIMIT 1),
      false
    ) THEN ke.quality_score * 1.5 
    ELSE ke.quality_score 
    END DESC,
    ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;