-- Track which knowledge entries have been sanitized for PII
ALTER TABLE public.knowledge_entries
  ADD COLUMN IF NOT EXISTS sanitized_at TIMESTAMPTZ;
