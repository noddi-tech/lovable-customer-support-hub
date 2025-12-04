-- Enable pg_trgm extension first (for trigram search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add indexes for full-text search performance

-- Create GIN index on messages content for fast text search
CREATE INDEX IF NOT EXISTS idx_messages_content_gin 
ON public.messages USING gin(to_tsvector('english', COALESCE(content, '')));

-- Create GIN index on conversations subject for fast text search
CREATE INDEX IF NOT EXISTS idx_conversations_subject_gin 
ON public.conversations USING gin(to_tsvector('english', COALESCE(subject, '')));

-- Create GIN index on conversations preview_text for fast text search
CREATE INDEX IF NOT EXISTS idx_conversations_preview_gin 
ON public.conversations USING gin(to_tsvector('english', COALESCE(preview_text, '')));

-- Create index on customers for name/email search (using trigrams)
CREATE INDEX IF NOT EXISTS idx_customers_full_name_trgm 
ON public.customers USING gin(full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_email_trgm 
ON public.customers USING gin(email gin_trgm_ops);