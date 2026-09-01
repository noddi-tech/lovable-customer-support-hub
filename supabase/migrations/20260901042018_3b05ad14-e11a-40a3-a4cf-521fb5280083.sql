CREATE OR REPLACE FUNCTION public.get_inbox_outstanding_counts()
RETURNS TABLE(inbox_id uuid, open_count bigint, pending_count bigint, total_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT p.organization_id INTO v_org_id FROM profiles p WHERE p.user_id = auth.uid();
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH threaded AS (
    SELECT DISTINCT ON (
      c.inbox_id,
      LOWER(COALESCE(cu.email, '')),
      LOWER(REGEXP_REPLACE(COALESCE(c.subject, ''), '^(re:|fwd?:|fw:|aw:|sv:|vs:)\s*', '', 'gi'))
    )
      c.inbox_id AS ibx, c.status, c.deleted_at, c.snooze_until, c.is_archived
    FROM conversations c
    LEFT JOIN customers cu ON c.customer_id = cu.id
    WHERE c.organization_id = v_org_id
      AND c.inbox_id IS NOT NULL
    ORDER BY c.inbox_id,
      LOWER(COALESCE(cu.email, '')),
      LOWER(REGEXP_REPLACE(COALESCE(c.subject, ''), '^(re:|fwd?:|fw:|aw:|sv:|vs:)\s*', '', 'gi')),
      COALESCE(c.received_at, c.updated_at) DESC
  )
  SELECT t.ibx,
    COUNT(*) FILTER (WHERE t.status = 'open')::bigint,
    COUNT(*) FILTER (WHERE t.status = 'pending')::bigint,
    COUNT(*) FILTER (WHERE t.status IN ('open','pending'))::bigint
  FROM threaded t
  WHERE t.deleted_at IS NULL
    AND COALESCE(t.is_archived, false) = false
    AND (t.snooze_until IS NULL OR t.snooze_until <= NOW())
  GROUP BY t.ibx;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inbox_outstanding_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inbox_outstanding_counts() TO service_role;