-- Drop the old overloaded version that causes ambiguity
-- The old version has: (query_embedding vector, match_threshold double precision, match_count integer, org_id uuid)
-- The new version has: (query_embedding vector, org_id uuid, match_threshold double precision, match_count integer)
DROP FUNCTION IF EXISTS public.find_similar_responses(vector, double precision, integer, uuid);