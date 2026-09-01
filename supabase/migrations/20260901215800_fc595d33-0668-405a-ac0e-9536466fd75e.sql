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
      AND c.channel::text IN ('email', 'widget')
  ), live AS (
    SELECT c.channel::text AS channel, c.status, c.last_message_sender_type
    FROM public.conversations c
    WHERE c.organization_id = v_org
      AND c.deleted_at IS NULL
      AND c.status <> 'closed'
      AND c.channel::text IN ('email', 'widget')
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
    FROM (SELECT unnest(ARRAY['email','widget']) AS channel) ch
  ), case_stats AS (
    SELECT
      'cases'::text AS channel,
      COUNT(*) FILTER (WHERE cs.created_at >= v_since) AS received,
      COUNT(*) FILTER (WHERE cs.created_at >= v_since
        AND cs.status::text IN ('resolved','closed')) AS closed,
      ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY CASE WHEN cs.created_at >= v_since AND cs.first_response_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (cs.first_response_at - cs.created_at)) / 60.0 END))::numeric, 1) AS median_frt,
      COUNT(*) FILTER (WHERE cs.status::text NOT IN ('resolved','closed')) AS open_now,
      COUNT(*) FILTER (WHERE cs.status::text IN ('open','in_progress','waiting_internal')) AS awaiting_us
    FROM public.cases cs
    WHERE cs.organization_id = v_org
  ), all_rows AS (
    SELECT channel, received, closed, median_frt, open_now, awaiting_us FROM per_channel
    UNION ALL
    SELECT channel, received, closed, median_frt, open_now, awaiting_us FROM case_stats
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
      FROM all_rows p
    ), '[]'::jsonb),
    'totals', (
      SELECT jsonb_build_object(
        'received', COALESCE(SUM(p.received), 0),
        'closed', COALESCE(SUM(p.closed), 0),
        'open', COALESCE(SUM(p.open_now), 0),
        'awaiting_us', COALESCE(SUM(p.awaiting_us), 0)
      ) FROM all_rows p
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_channel_overview_metrics(integer) TO authenticated;