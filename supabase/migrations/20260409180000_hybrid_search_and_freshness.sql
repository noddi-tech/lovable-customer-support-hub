-- Phase 5: Knowledge freshness, hybrid search, and infrastructure

-- ═══════════════════════════════════════════════════════════
-- 5A: Knowledge freshness scoring
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.knowledge_entries
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS staleness_category TEXT DEFAULT 'faq'
    CHECK (staleness_category IN ('pricing', 'procedures', 'faq', 'permanent'));

-- Update review_queue reason CHECK to include 'stale_knowledge'
ALTER TABLE public.review_queue
  DROP CONSTRAINT IF EXISTS review_queue_reason_check;
ALTER TABLE public.review_queue
  ADD CONSTRAINT review_queue_reason_check
  CHECK (reason IN ('low_eval_score', 'quality_flag', 'negative_feedback', 'knowledge_gap', 'low_confidence', 'stale_knowledge'));

-- ═══════════════════════════════════════════════════════════
-- 5B: Hybrid search infrastructure
-- ═══════════════════════════════════════════════════════════

-- Add tsvector column for full-text search
ALTER TABLE public.knowledge_entries
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Populate search_vector from existing data
UPDATE public.knowledge_entries
SET search_vector = to_tsvector('simple', COALESCE(customer_context, '') || ' ' || COALESCE(agent_response, ''))
WHERE search_vector IS NULL;

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_search_vector
  ON public.knowledge_entries USING GIN(search_vector);

-- HNSW index for vector similarity (was missing — big perf improvement)
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_embedding_hnsw
  ON public.knowledge_entries USING hnsw (embedding vector_cosine_ops);

-- Auto-update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.update_knowledge_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    COALESCE(NEW.customer_context, '') || ' ' || COALESCE(NEW.agent_response, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_knowledge_search_vector ON public.knowledge_entries;
CREATE TRIGGER trg_update_knowledge_search_vector
  BEFORE INSERT OR UPDATE OF customer_context, agent_response
  ON public.knowledge_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_knowledge_search_vector();

-- ═══════════════════════════════════════════════════════════
-- Hybrid search RPC
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.hybrid_search_knowledge(
  query_embedding vector(1536),
  query_text TEXT,
  org_id UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  customer_context TEXT,
  agent_response TEXT,
  quality_score NUMERIC,
  category TEXT,
  similarity FLOAT,
  freshness_boost FLOAT,
  final_score FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts_query TSQUERY;
BEGIN
  -- Build tsquery from the search text (simple config, works for NO + EN)
  ts_query := plainto_tsquery('simple', query_text);

  RETURN QUERY
  SELECT
    ke.id,
    ke.customer_context,
    ke.agent_response,
    ke.quality_score,
    ke.category,
    (1 - (ke.embedding <=> query_embedding))::FLOAT AS similarity,
    -- Freshness boost: decays based on staleness_category threshold
    GREATEST(0.2, 1.0 - (
      EXTRACT(EPOCH FROM (now() - COALESCE(ke.last_verified_at, ke.created_at))) / 86400.0
      / (CASE ke.staleness_category
           WHEN 'pricing' THEN 2.0      -- 1 day tolerance, full decay at 2 days
           WHEN 'procedures' THEN 60.0  -- 30 day tolerance, full decay at 60
           WHEN 'faq' THEN 180.0        -- 90 day tolerance, full decay at 180
           WHEN 'permanent' THEN 999999.0
           ELSE 180.0
         END)
    ))::FLOAT AS freshness_boost,
    -- Combined score: vector 0.60 + text 0.25 + freshness 0.15
    (
      (1 - (ke.embedding <=> query_embedding)) * 0.60
      + COALESCE(ts_rank(ke.search_vector, ts_query), 0) * 0.25
      + GREATEST(0.2, 1.0 - (
          EXTRACT(EPOCH FROM (now() - COALESCE(ke.last_verified_at, ke.created_at))) / 86400.0
          / (CASE ke.staleness_category
               WHEN 'pricing' THEN 2.0
               WHEN 'procedures' THEN 60.0
               WHEN 'faq' THEN 180.0
               WHEN 'permanent' THEN 999999.0
               ELSE 180.0
             END)
        )) * 0.15
    )::FLOAT AS final_score
  FROM public.knowledge_entries ke
  WHERE ke.organization_id = org_id
    AND ke.is_active = true
    AND ke.embedding IS NOT NULL
    AND (1 - (ke.embedding <=> query_embedding)) > 0.5
  ORDER BY final_score DESC
  LIMIT match_count;
END;
$$;
