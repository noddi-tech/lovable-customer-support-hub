-- RPC function for efficient cosine similarity search against customer memories
CREATE OR REPLACE FUNCTION public.find_similar_memory(
  query_embedding vector(1536),
  target_org_id UUID,
  target_identifier TEXT,
  similarity_threshold DOUBLE PRECISION DEFAULT 0.92
)
RETURNS TABLE(id UUID, confidence NUMERIC, similarity DOUBLE PRECISION)
LANGUAGE sql STABLE
AS $$
  SELECT
    cm.id,
    cm.confidence,
    1 - (cm.embedding <=> query_embedding) AS similarity
  FROM public.customer_memories cm
  WHERE cm.organization_id = target_org_id
    AND cm.customer_identifier = target_identifier
    AND cm.is_active = true
    AND cm.embedding IS NOT NULL
    AND 1 - (cm.embedding <=> query_embedding) > similarity_threshold
  ORDER BY cm.embedding <=> query_embedding
  LIMIT 1;
$$;
