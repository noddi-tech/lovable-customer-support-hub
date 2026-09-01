
CREATE OR REPLACE FUNCTION public.get_agent_leaderboard(p_days integer DEFAULT 30, p_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_since timestamptz;
  v_result jsonb;
BEGIN
  v_org := public.get_user_organization_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  v_since := now() - make_interval(days => GREATEST(COALESCE(p_days, 30), 1));

  WITH closed_convs AS (
    SELECT c.id, c.assigned_to_id, c.created_at, c.closed_at
    FROM public.conversations c
    WHERE c.organization_id = v_org
      AND c.deleted_at IS NULL
      AND c.status = 'closed'
      AND c.closed_at IS NOT NULL
      AND c.closed_at >= v_since
      AND c.assigned_to_id IS NOT NULL
  ), resolved AS (
    SELECT
      assigned_to_id AS profile_id,
      COUNT(*) AS resolved,
      ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 60.0)::numeric, 1) AS avg_resolve_minutes,
      ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (closed_at - created_at)) / 60.0))::numeric, 1) AS median_resolve_minutes
    FROM closed_convs
    GROUP BY assigned_to_id
  ), replies AS (
    -- messages.sender_id stores the auth user id, so resolve it to a profile id
    SELECT
      sp.id AS profile_id,
      COUNT(*) AS replies_sent,
      ROUND(AVG(CASE WHEN m.created_at = fr.first_agent_at
        THEN EXTRACT(EPOCH FROM (m.created_at - c.created_at)) / 60.0 END)::numeric, 1) AS avg_first_response_minutes,
      ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY CASE WHEN m.created_at = fr.first_agent_at
          THEN EXTRACT(EPOCH FROM (m.created_at - c.created_at)) / 60.0 END))::numeric, 1)
        AS median_first_response_minutes,
      COUNT(*) FILTER (WHERE m.created_at = fr.first_agent_at) AS first_replies
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    JOIN public.profiles sp ON sp.id = m.sender_id OR sp.user_id = m.sender_id
    JOIN LATERAL (
      SELECT MIN(m2.created_at) AS first_agent_at
      FROM public.messages m2
      WHERE m2.conversation_id = c.id AND m2.sender_type = 'agent'
        AND COALESCE(m2.is_internal, false) = false
    ) fr ON true
    WHERE c.organization_id = v_org
      AND c.deleted_at IS NULL
      AND m.sender_type = 'agent'
      AND COALESCE(m.is_internal, false) = false
      AND m.sender_id IS NOT NULL
      AND m.created_at >= v_since
    GROUP BY sp.id
  ), combined AS (
    SELECT
      p.id AS profile_id,
      p.full_name,
      p.email,
      p.avatar_url,
      COALESCE(r.resolved, 0) AS resolved,
      r.avg_resolve_minutes,
      r.median_resolve_minutes,
      COALESCE(rp.replies_sent, 0) AS replies_sent,
      COALESCE(rp.first_replies, 0) AS first_replies,
      rp.avg_first_response_minutes,
      rp.median_first_response_minutes
    FROM public.profiles p
    LEFT JOIN resolved r ON r.profile_id = p.id
    LEFT JOIN replies rp ON rp.profile_id = p.id
    WHERE p.organization_id = v_org
      AND (r.profile_id IS NOT NULL OR rp.profile_id IS NOT NULL)
  ), scored AS (
    SELECT
      c.*,
      ROUND((
        c.resolved * 10
        + c.first_replies * 3
        + CASE WHEN c.median_first_response_minutes IS NOT NULL
            THEN GREATEST(0, 60 - LEAST(c.median_first_response_minutes, 60)) / 2
            ELSE 0 END
      )::numeric, 0) AS score
    FROM combined c
  ), top AS (
    SELECT * FROM scored ORDER BY score DESC, resolved DESC LIMIT GREATEST(COALESCE(p_limit, 10), 1)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'profile_id', t.profile_id,
    'full_name', t.full_name,
    'email', t.email,
    'avatar_url', t.avatar_url,
    'resolved', t.resolved,
    'avg_resolve_minutes', t.avg_resolve_minutes,
    'median_resolve_minutes', t.median_resolve_minutes,
    'replies_sent', t.replies_sent,
    'first_replies', t.first_replies,
    'avg_first_response_minutes', t.avg_first_response_minutes,
    'median_first_response_minutes', t.median_first_response_minutes,
    'score', t.score
  ) ORDER BY t.score DESC, t.resolved DESC), '[]'::jsonb)
  INTO v_result
  FROM top t;

  RETURN jsonb_build_object(
    'days', GREATEST(COALESCE(p_days, 30), 1),
    'generated_at', now(),
    'leaders', v_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_leaderboard(integer, integer) TO authenticated;
