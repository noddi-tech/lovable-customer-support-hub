-- 1. Channel-aware SLA policies
ALTER TABLE public.sla_policies
  ADD COLUMN IF NOT EXISTS channel text;

ALTER TABLE public.sla_policies
  DROP CONSTRAINT IF EXISTS sla_policies_channel_check;
ALTER TABLE public.sla_policies
  ADD CONSTRAINT sla_policies_channel_check
  CHECK (channel IS NULL OR channel IN ('email','widget','sms','whatsapp','voice','facebook','instagram'));

CREATE UNIQUE INDEX IF NOT EXISTS sla_policies_org_inbox_channel_priority_idx
  ON public.sla_policies (organization_id, COALESCE(inbox_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(channel, ''), priority);

-- 2. Breach calculation prefers channel-specific targets
CREATE OR REPLACE FUNCTION public.calculate_sla_breach()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations c
     SET sla_breach_at = COALESCE(c.received_at, c.created_at) + make_interval(mins => COALESCE(pol.first_response_minutes, 1440)),
         resolution_due_at = COALESCE(c.received_at, c.created_at) + make_interval(mins => COALESCE(pol.resolution_minutes, 1440))
    FROM LATERAL (
           SELECT p.first_response_minutes, p.resolution_minutes
             FROM public.sla_policies p
            WHERE p.organization_id = c.organization_id
              AND p.is_active
              AND p.priority = c.priority
              AND (p.inbox_id = c.inbox_id OR p.inbox_id IS NULL)
              AND (p.channel = c.channel::text OR p.channel IS NULL)
            ORDER BY (p.channel IS NOT NULL) DESC, (p.inbox_id IS NOT NULL) DESC
            LIMIT 1
         ) pol
   WHERE c.status IN ('open', 'pending')
     AND c.first_response_at IS NULL
     AND c.deleted_at IS NULL;

  UPDATE public.conversations
     SET sla_breach_at = NULL
   WHERE sla_breach_at IS NOT NULL
     AND first_response_at IS NOT NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.calculate_sla_breach() FROM anon, authenticated;

-- 3. Channel-aware upsert / delete (inbox may be NULL = organization-wide)
CREATE OR REPLACE FUNCTION public.upsert_channel_sla_policy(
  p_channel text,
  p_priority text,
  p_first_response_minutes integer,
  p_resolution_minutes integer,
  p_inbox_id uuid DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_id uuid;
BEGIN
  IF p_priority NOT IN ('low','normal','high','urgent') THEN
    RAISE EXCEPTION 'Invalid priority %', p_priority;
  END IF;
  IF p_channel IS NULL OR p_channel NOT IN ('email','widget','sms','whatsapp','voice','facebook','instagram') THEN
    RAISE EXCEPTION 'Invalid channel %', p_channel;
  END IF;
  IF p_first_response_minutes < 1 OR p_first_response_minutes > 100000
     OR p_resolution_minutes < 1 OR p_resolution_minutes > 1000000 THEN
    RAISE EXCEPTION 'SLA minutes out of range';
  END IF;

  IF p_inbox_id IS NOT NULL THEN
    SELECT organization_id INTO v_org FROM public.inboxes WHERE id = p_inbox_id;
    IF v_org IS NULL THEN RAISE EXCEPTION 'Inbox not found'; END IF;
  ELSE
    v_org := public.get_user_organization_id();
  END IF;

  IF v_org IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF NOT (public.is_super_admin() OR (v_org = public.get_user_organization_id()
          AND public.has_permission(auth.uid(), 'manage_settings'::app_permission))) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.sla_policies
     SET first_response_minutes = p_first_response_minutes,
         resolution_minutes = p_resolution_minutes,
         is_active = p_is_active,
         updated_at = now()
   WHERE organization_id = v_org
     AND channel = p_channel
     AND priority = p_priority
     AND inbox_id IS NOT DISTINCT FROM p_inbox_id
   RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO public.sla_policies (organization_id, inbox_id, channel, priority, first_response_minutes, resolution_minutes, is_active)
    VALUES (v_org, p_inbox_id, p_channel, p_priority, p_first_response_minutes, p_resolution_minutes, p_is_active)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_channel_sla_policy(text, text, integer, integer, uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_channel_sla_policy(p_channel text, p_priority text, p_inbox_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  IF p_inbox_id IS NOT NULL THEN
    SELECT organization_id INTO v_org FROM public.inboxes WHERE id = p_inbox_id;
    IF v_org IS NULL THEN RAISE EXCEPTION 'Inbox not found'; END IF;
  ELSE
    v_org := public.get_user_organization_id();
  END IF;

  IF v_org IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF NOT (public.is_super_admin() OR (v_org = public.get_user_organization_id()
          AND public.has_permission(auth.uid(), 'manage_settings'::app_permission))) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.sla_policies
   WHERE organization_id = v_org
     AND channel = p_channel
     AND priority = p_priority
     AND inbox_id IS NOT DISTINCT FROM p_inbox_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_channel_sla_policy(text, text, uuid) TO authenticated;

-- 4. Read policies for the current organization (used by the live chat SLA dialog)
CREATE OR REPLACE FUNCTION public.get_channel_sla_policies(p_channel text)
RETURNS TABLE(id uuid, inbox_id uuid, channel text, priority text, first_response_minutes integer, resolution_minutes integer, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.inbox_id, p.channel, p.priority, p.first_response_minutes, p.resolution_minutes, p.is_active
    FROM public.sla_policies p
   WHERE p.organization_id = public.get_user_organization_id()
     AND (p.channel = p_channel OR p.channel IS NULL);
$$;

GRANT EXECUTE ON FUNCTION public.get_channel_sla_policies(text) TO authenticated;

-- 5. Support metrics can be scoped to a single channel
CREATE OR REPLACE FUNCTION public.get_inbox_support_metrics(p_inbox_id uuid DEFAULT NULL, p_days integer DEFAULT 30, p_channel text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid := public.get_user_organization_id();
  v_inbox_org uuid;
  v_days integer := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_since timestamptz := now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 30), 1), 365));
  v_result jsonb;
BEGIN
  IF p_inbox_id IS NOT NULL THEN
    SELECT organization_id INTO v_inbox_org FROM public.inboxes WHERE id = p_inbox_id;
    IF v_inbox_org IS NULL THEN RAISE EXCEPTION 'Inbox not found'; END IF;
    IF public.is_super_admin() THEN
      v_org := v_inbox_org;
    ELSIF v_inbox_org IS DISTINCT FROM v_org THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  END IF;

  IF v_org IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  WITH scoped AS (
    SELECT c.id, c.status, c.priority, c.assigned_to_id, c.first_response_at, c.closed_at,
           c.sla_breach_at, c.last_message_sender_type,
           COALESCE(c.received_at, c.created_at) AS started_at,
           COALESCE(pol.first_response_minutes, 1440) AS frt_target,
           COALESCE(pol.resolution_minutes, 1440) AS res_target
      FROM public.conversations c
      LEFT JOIN LATERAL (
        SELECT p.first_response_minutes, p.resolution_minutes
          FROM public.sla_policies p
         WHERE p.organization_id = c.organization_id
           AND p.is_active
           AND p.priority = c.priority
           AND (p.inbox_id = c.inbox_id OR p.inbox_id IS NULL)
           AND (p.channel = c.channel::text OR p.channel IS NULL)
         ORDER BY (p.channel IS NOT NULL) DESC, (p.inbox_id IS NOT NULL) DESC
         LIMIT 1
      ) pol ON true
     WHERE c.organization_id = v_org
       AND c.deleted_at IS NULL
       AND (p_inbox_id IS NULL OR c.inbox_id = p_inbox_id)
       AND (p_channel IS NULL OR c.channel::text = p_channel)
  ),
  period AS (
    SELECT * FROM scoped WHERE started_at >= v_since
  ),
  frt AS (
    SELECT EXTRACT(EPOCH FROM (first_response_at - started_at)) / 60.0 AS mins,
           (EXTRACT(EPOCH FROM (first_response_at - started_at)) / 60.0) <= frt_target AS in_sla
      FROM period
     WHERE first_response_at IS NOT NULL AND first_response_at >= started_at
  ),
  res AS (
    SELECT EXTRACT(EPOCH FROM (closed_at - started_at)) / 60.0 AS mins,
           (EXTRACT(EPOCH FROM (closed_at - started_at)) / 60.0) <= res_target AS in_sla
      FROM period
     WHERE closed_at IS NOT NULL AND closed_at >= started_at
  ),
  touches AS (
    SELECT p.id,
           (SELECT count(*) FROM public.messages m
             WHERE m.conversation_id = p.id AND m.sender_type = 'agent' AND COALESCE(m.is_internal, false) = false) AS agent_msgs,
           (SELECT count(*) FROM public.messages m
             WHERE m.conversation_id = p.id AND m.sender_type = 'customer') AS customer_msgs
      FROM period p
     WHERE p.closed_at IS NOT NULL
  )
  SELECT jsonb_build_object(
    'days', v_days,
    'channel', p_channel,
    'generated_at', now(),
    'volume', jsonb_build_object(
      'received', (SELECT count(*) FROM period),
      'closed', (SELECT count(*) FROM period WHERE closed_at IS NOT NULL),
      'per_day', ROUND(((SELECT count(*) FROM period)::numeric / v_days), 2)
    ),
    'first_response', jsonb_build_object(
      'answered', (SELECT count(*) FROM frt),
      'awaiting', (SELECT count(*) FROM period WHERE first_response_at IS NULL AND status <> 'closed'),
      'avg_minutes', (SELECT ROUND(avg(mins)::numeric, 1) FROM frt),
      'median_minutes', (SELECT ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY mins)::numeric, 1) FROM frt),
      'p90_minutes', (SELECT ROUND(percentile_cont(0.9) WITHIN GROUP (ORDER BY mins)::numeric, 1) FROM frt),
      'sla_target_minutes', (SELECT ROUND(avg(frt_target)::numeric, 0) FROM period),
      'sla_attainment_pct', (SELECT CASE WHEN count(*) = 0 THEN NULL
                                    ELSE ROUND(100.0 * count(*) FILTER (WHERE in_sla) / count(*), 1) END FROM frt)
    ),
    'resolution', jsonb_build_object(
      'avg_minutes', (SELECT ROUND(avg(mins)::numeric, 1) FROM res),
      'median_minutes', (SELECT ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY mins)::numeric, 1) FROM res),
      'p90_minutes', (SELECT ROUND(percentile_cont(0.9) WITHIN GROUP (ORDER BY mins)::numeric, 1) FROM res),
      'sla_target_minutes', (SELECT ROUND(avg(res_target)::numeric, 0) FROM period),
      'sla_attainment_pct', (SELECT CASE WHEN count(*) = 0 THEN NULL
                                    ELSE ROUND(100.0 * count(*) FILTER (WHERE in_sla) / count(*), 1) END FROM res),
      'resolution_rate_pct', (SELECT CASE WHEN (SELECT count(*) FROM period) = 0 THEN NULL
                                     ELSE ROUND(100.0 * (SELECT count(*) FROM period WHERE closed_at IS NOT NULL)
                                                / (SELECT count(*) FROM period), 1) END)
    ),
    'efficiency', jsonb_build_object(
      'one_touch_pct', (SELECT CASE WHEN count(*) = 0 THEN NULL
                              ELSE ROUND(100.0 * count(*) FILTER (WHERE agent_msgs <= 1) / count(*), 1) END FROM touches),
      'avg_agent_replies', (SELECT ROUND(avg(agent_msgs)::numeric, 2) FROM touches),
      'avg_customer_messages', (SELECT ROUND(avg(customer_msgs)::numeric, 2) FROM touches)
    ),
    'backlog', jsonb_build_object(
      'open', (SELECT count(*) FROM scoped WHERE status <> 'closed'),
      'unassigned', (SELECT count(*) FROM scoped WHERE status <> 'closed' AND assigned_to_id IS NULL),
      'awaiting_customer_reply', (SELECT count(*) FROM scoped WHERE status <> 'closed' AND last_message_sender_type = 'agent'),
      'awaiting_us', (SELECT count(*) FROM scoped WHERE status <> 'closed' AND COALESCE(last_message_sender_type, 'customer') <> 'agent'),
      'breaching_now', (SELECT count(*) FROM scoped WHERE status <> 'closed' AND first_response_at IS NULL
                                                     AND sla_breach_at IS NOT NULL AND sla_breach_at < now()),
      'at_risk_2h', (SELECT count(*) FROM scoped WHERE status <> 'closed' AND first_response_at IS NULL
                                                   AND sla_breach_at IS NOT NULL AND sla_breach_at >= now()
                                                   AND sla_breach_at < now() + interval '2 hours'),
      'oldest_open_hours', (SELECT ROUND((EXTRACT(EPOCH FROM (now() - min(started_at))) / 3600.0)::numeric, 1)
                              FROM scoped WHERE status <> 'closed')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inbox_support_metrics(uuid, integer, text) TO authenticated;