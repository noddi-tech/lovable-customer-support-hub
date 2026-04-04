-- Phase 1: Customer Memory Profiles
-- Creates tables for storing per-customer memories and synthesized summaries

-- ============================================================
-- Table 1: customer_memories
-- ============================================================
CREATE TABLE public.customer_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('phone', 'email')),
  memory_type TEXT NOT NULL CHECK (memory_type IN ('fact', 'preference', 'issue', 'sentiment', 'vehicle')),
  memory_text TEXT NOT NULL,
  structured_data JSONB,
  confidence NUMERIC NOT NULL DEFAULT 0.8,
  source_conversation_id UUID REFERENCES public.widget_ai_conversations(id) ON DELETE SET NULL,
  embedding vector(1536),
  language TEXT DEFAULT 'en',
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_memories_lookup
  ON public.customer_memories (organization_id, customer_identifier, is_active)
  WHERE is_active = true;

CREATE INDEX idx_customer_memories_embedding
  ON public.customer_memories USING hnsw (embedding vector_cosine_ops);

CREATE TRIGGER update_customer_memories_updated_at
  BEFORE UPDATE ON public.customer_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.customer_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view memories in their org"
  ON public.customer_memories FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert memories in their org"
  ON public.customer_memories FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update memories in their org"
  ON public.customer_memories FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

-- ============================================================
-- Table 2: customer_summaries
-- ============================================================
CREATE TABLE public.customer_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('phone', 'email')),
  summary_text TEXT NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  sentiment_trend TEXT CHECK (sentiment_trend IN ('improving', 'stable', 'declining')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_customer_summaries_unique
  ON public.customer_summaries (organization_id, customer_identifier, identifier_type);

CREATE TRIGGER update_customer_summaries_updated_at
  BEFORE UPDATE ON public.customer_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.customer_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view summaries in their org"
  ON public.customer_summaries FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert summaries in their org"
  ON public.customer_summaries FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update summaries in their org"
  ON public.customer_summaries FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));
