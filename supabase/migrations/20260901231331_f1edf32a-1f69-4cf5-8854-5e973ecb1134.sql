CREATE OR REPLACE FUNCTION public.find_conversation_by_short_ref(p_organization_id uuid, p_short_ref text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.conversations c
  WHERE c.organization_id = p_organization_id
    AND left(replace(c.id::text, '-', ''), 8) = lower(p_short_ref)
  ORDER BY c.created_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.find_conversation_by_short_ref(uuid, text) TO service_role;