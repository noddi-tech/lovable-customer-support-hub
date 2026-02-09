
ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS priority integer DEFAULT NULL;

ALTER TABLE knowledge_pending_entries 
  ADD COLUMN IF NOT EXISTS admin_quality_score numeric DEFAULT NULL;

ALTER TABLE widget_ai_feedback 
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'widget';
