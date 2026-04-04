-- Add 'ai_draft' to response_tracking.response_source CHECK constraint
-- Required for tracking when agents send/edit AI-generated email drafts

ALTER TABLE public.response_tracking
  DROP CONSTRAINT IF EXISTS response_tracking_response_source_check;

ALTER TABLE public.response_tracking
  ADD CONSTRAINT response_tracking_response_source_check
  CHECK (response_source IN ('manual', 'ai_suggestion', 'template', 'knowledge_base', 'ai_draft'));
