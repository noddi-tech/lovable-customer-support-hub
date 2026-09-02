CREATE OR REPLACE FUNCTION public.get_sla_risk_by_inbox(p_horizon timestamptz DEFAULT (now() + interval '1 hour'))
RETURNS TABLE(id uuid, inbox_id uuid, channel text, subject text, sla_breach_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT p.organization_id INTO v_org_id
  FROM profiles p
  WHERE p.user_id = auth.uid();

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH threaded AS (
    SELECT DISTINCT ON (
      LOWER(COALESCE(cu.email, '')),
      LOWER(REGEXP_REPLACE(COALESCE(c.subject, ''), '^(re:|fwd?:|fw:|aw:|sv:|vs:)\s*', '', 'gi'))
    )
    c.id, c.status, c.is_archived, c.deleted_at, c.snooze_until,
    c.channel, c.inbox_id, c.subject, c.sla_breach_at
    FROM conversations c
    LEFT JOIN customers cu ON c.customer_id = cu.id
    WHERE c.organization_id = v_org_id
    ORDER BY LOWER(COALESCE(cu.email, '')),
      LOWER(REGEXP_REPLACE(COALESCE(c.subject, ''), '^(re:|fwd?:|fw:|aw:|sv:|vs:)\s*', '', 'gi')),
      COALESCE(c.received_at, c.updated_at) DESC
  )
  SELECT t.id, t.inbox_id, t.channel, t.subject, t.sla_breach_at
  FROM threaded t
  WHERE t.sla_breach_at IS NOT NULL
    AND t.sla_breach_at <= p_horizon
    AND t.status = 'open'
    AND t.deleted_at IS NULL
    AND COALESCE(t.is_archived, false) = false
    AND (t.snooze_until IS NULL OR t.snooze_until <= now())
    AND t.inbox_id IS NOT NULL
  ORDER BY t.sla_breach_at ASC
  LIMIT 500;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_sla_risk_by_inbox(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sla_risk_by_inbox(timestamptz) TO service_role;