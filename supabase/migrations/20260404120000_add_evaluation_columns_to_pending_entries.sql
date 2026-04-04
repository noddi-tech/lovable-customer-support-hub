-- Add evaluation columns to knowledge_pending_entries for bulk AI scoring
ALTER TABLE public.knowledge_pending_entries
  ADD COLUMN IF NOT EXISTS evaluation_score NUMERIC(4,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS evaluation_notes JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for fetching unevaluated pending entries efficiently
CREATE INDEX IF NOT EXISTS idx_pending_entries_evaluation
  ON public.knowledge_pending_entries (organization_id, evaluation_score)
  WHERE review_status = 'pending' AND evaluation_score IS NULL;
