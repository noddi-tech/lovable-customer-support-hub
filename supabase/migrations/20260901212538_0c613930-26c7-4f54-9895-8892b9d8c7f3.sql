
-- =========================================================================
-- Live chat KPIs: totals + per brand
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_chat_support_metrics(p_days integer DEFAULT 30)
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

  WITH base AS (
    SELECT
      c.id,
      COALESCE(NULLIF(c.metadata->>'brand', ''), NULLIF(wc.company_name, ''), 'Unbranded') AS brand,
      c.created_at,
      c.closed_at,
      c.status,
      c.first_response_at,
      (SELECT MIN(m.created_at) FROM public.messages m
         WHERE m.conversation_id = c.id AND m.sender_type = 'agent' AND COALESCE(m.is_internal, false) = false
      ) AS first_agent_at,
      (SELECT COUNT(*) FROM public.messages m
         WHERE m.conversation_id = c.id AND m.sender_type = 'agent' AND COALESCE(m.is_internal, false) = false
      ) AS agent_replies,
      (SELECT COUNT(*) FROM public.messages m
         WHERE m.conversation_id = c.id AND m.sender_type = 'customer'
      ) AS customer_messages
    FROM public.conversations c
    LEFT JOIN public.widget_configs wc ON wc.inbox_id = c.inbox_id
    WHERE c.organization_id = v_org
      AND c.channel = 'widget'
      AND c.deleted_at IS NULL
      AND c.created_at >= v_since
  ), enriched AS (
    SELECT
      b.*,
      CASE WHEN COALESCE(b.first_response_at, b.first_agent_at) IS NOT NULL
        THEN EXTRACT(EPOCH FROM (COALESCE(b.first_response_at, b.first_agent_at) - b.created_at)) / 60.0
      END AS frt_minutes,
      CASE WHEN b.status = 'closed' AND b.closed_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (b.closed_at - b.created_at)) / 60.0
      END AS res_minutes
    FROM base b
  ), totals AS (
    SELECT
      COUNT(*) AS chats,
      COUNT(*) FILTER (WHERE status = 'closed') AS resolved,
      COUNT(*) FILTER (WHERE status <> 'closed') AS open_chats,
      COUNT(*) FILTER (WHERE frt_minutes IS NULL AND status <> 'closed') AS unanswered,
      COUNT(*) FILTER (WHERE agent_replies = 0 AND status = 'closed') AS abandoned,
      ROUND(AVG(frt_minutes)::numeric, 1) AS avg_frt,
      ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY frt_minutes))::numeric, 1) AS median_frt,
      ROUND((PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY frt_minutes))::numeric, 1) AS p90_frt,
      ROUND(AVG(res_minutes)::numeric, 1) AS avg_res,
      ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY res_minutes))::numeric, 1) AS median_res,
      ROUND(AVG(agent_replies)::numeric, 2) AS avg_agent_replies,
      ROUND(AVG(customer_messages)::numeric, 2) AS avg_customer_messages
    FROM enriched
  ), brands AS (
    SELECT
      brand,
      COUNT(*) AS chats,
      COUNT(*) FILTER (WHERE status = 'closed') AS resolved,
      COUNT(*) FILTER (WHERE status <> 'closed') AS open_chats,
      ROUND(AVG(frt_minutes)::numeric, 1) AS avg_frt,
      ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY frt_minutes))::numeric, 1) AS median_frt,
      ROUND(AVG(res_minutes)::numeric, 1) AS avg_res,
      ROUND(AVG(agent_replies)::numeric, 2) AS avg_agent_replies
    FROM enriched
    GROUP BY brand
  )
  SELECT jsonb_build_object(
    'days', GREATEST(COALESCE(p_days, 30), 1),
    'generated_at', now(),
    'totals', (
      SELECT jsonb_build_object(
        'chats', t.chats,
        'resolved', t.resolved,
        'open', t.open_chats,
        'unanswered', t.unanswered,
        'abandoned', t.abandoned,
        'per_day', ROUND((t.chats::numeric / GREATEST(COALESCE(p_days, 30), 1)), 1),
        'avg_first_response_minutes', t.avg_frt,
        'median_first_response_minutes', t.median_frt,
        'p90_first_response_minutes', t.p90_frt,
        'avg_resolution_minutes', t.avg_res,
        'median_resolution_minutes', t.median_res,
        'avg_agent_replies', t.avg_agent_replies,
        'avg_customer_messages', t.avg_customer_messages,
        'resolution_rate_pct', CASE WHEN t.chats > 0
          THEN ROUND((t.resolved::numeric * 100 / t.chats), 1) END
      ) FROM totals t
    ),
    'by_brand', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'brand', b.brand,
        'chats', b.chats,
        'resolved', b.resolved,
        'open', b.open_chats,
        'avg_first_response_minutes', b.avg_frt,
        'median_first_response_minutes', b.median_frt,
        'avg_resolution_minutes', b.avg_res,
        'avg_agent_replies', b.avg_agent_replies,
        'resolution_rate_pct', CASE WHEN b.chats > 0
          THEN ROUND((b.resolved::numeric * 100 / b.chats), 1) END
      ) ORDER BY b.chats DESC)
      FROM brands b
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_support_metrics(integer) TO authenticated;

-- =========================================================================
-- Channel overview: email / sms / live chat side by side
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_channel_overview_metrics(p_days integer DEFAULT 30)
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

  WITH recent AS (
    SELECT
      c.channel::text AS channel,
      c.status,
      c.created_at,
      c.closed_at,
      c.last_message_sender_type,
      CASE WHEN COALESCE(c.first_response_at, (
             SELECT MIN(m.created_at) FROM public.messages m
             WHERE m.conversation_id = c.id AND m.sender_type = 'agent'
               AND COALESCE(m.is_internal, false) = false)) IS NOT NULL
        THEN EXTRACT(EPOCH FROM (COALESCE(c.first_response_at, (
             SELECT MIN(m.created_at) FROM public.messages m
             WHERE m.conversation_id = c.id AND m.sender_type = 'agent'
               AND COALESCE(m.is_internal, false) = false)) - c.created_at)) / 60.0
      END AS frt_minutes
    FROM public.conversations c
    WHERE c.organization_id = v_org
      AND c.deleted_at IS NULL
      AND c.created_at >= v_since
  ), live AS (
    SELECT c.channel::text AS channel, c.status, c.last_message_sender_type
    FROM public.conversations c
    WHERE c.organization_id = v_org
      AND c.deleted_at IS NULL
      AND c.status <> 'closed'
  ), per_channel AS (
    SELECT
      ch.channel,
      (SELECT COUNT(*) FROM recent r WHERE r.channel = ch.channel) AS received,
      (SELECT COUNT(*) FROM recent r WHERE r.channel = ch.channel AND r.status = 'closed') AS closed,
      (SELECT ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.frt_minutes))::numeric, 1)
         FROM recent r WHERE r.channel = ch.channel) AS median_frt,
      (SELECT COUNT(*) FROM live l WHERE l.channel = ch.channel) AS open_now,
      (SELECT COUNT(*) FROM live l WHERE l.channel = ch.channel
         AND COALESCE(l.last_message_sender_type, 'customer') = 'customer') AS awaiting_us
    FROM (SELECT unnest(ARRAY['email','sms','widget']) AS channel) ch
  )
  SELECT jsonb_build_object(
    'days', GREATEST(COALESCE(p_days, 30), 1),
    'generated_at', now(),
    'channels', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'channel', p.channel,
        'received', p.received,
        'closed', p.closed,
        'open', p.open_now,
        'awaiting_us', p.awaiting_us,
        'median_first_response_minutes', p.median_frt,
        'resolution_rate_pct', CASE WHEN p.received > 0
          THEN ROUND((p.closed::numeric * 100 / p.received), 1) END
      ) ORDER BY p.received DESC)
      FROM per_channel p
    ), '[]'::jsonb),
    'totals', (
      SELECT jsonb_build_object(
        'received', COALESCE(SUM(p.received), 0),
        'closed', COALESCE(SUM(p.closed), 0),
        'open', COALESCE(SUM(p.open_now), 0),
        'awaiting_us', COALESCE(SUM(p.awaiting_us), 0)
      ) FROM per_channel p
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_channel_overview_metrics(integer) TO authenticated;

-- =========================================================================
-- Gamified agent leaderboard
-- =========================================================================
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
    SELECT
      c.id,
      c.assigned_to_id,
      c.created_at,
      c.closed_at,
      (SELECT MIN(m.created_at) FROM public.messages m
         WHERE m.conversation_id = c.id AND m.sender_type = 'agent'
           AND COALESCE(m.is_internal, false) = false) AS first_agent_at
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
    SELECT
      m.sender_id AS profile_id,
      COUNT(*) AS replies_sent,
      ROUND(AVG(EXTRACT(EPOCH FROM (m.created_at - c.created_at)) / 60.0)
        FILTER (WHERE m.created_at = fr.first_agent_at)::numeric, 1) AS avg_first_response_minutes,
      ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY CASE WHEN m.created_at = fr.first_agent_at
          THEN EXTRACT(EPOCH FROM (m.created_at - c.created_at)) / 60.0 END))::numeric, 1)
        AS median_first_response_minutes,
      COUNT(*) FILTER (WHERE m.created_at = fr.first_agent_at) AS first_replies
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
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
    GROUP BY m.sender_id
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
  )
  SELECT COALESCE(jsonb_agg(row_to_jsonb(s) ORDER BY s.score DESC, s.resolved DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT * FROM scored ORDER BY score DESC, resolved DESC LIMIT GREATEST(COALESCE(p_limit, 10), 1)
  ) s;

  RETURN jsonb_build_object(
    'days', GREATEST(COALESCE(p_days, 30), 1),
    'generated_at', now(),
    'leaders', v_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_leaderboard(integer, integer) TO authenticated;
