CREATE OR REPLACE FUNCTION public.get_critical_alert_count(
  _organization_id uuid,
  _since timestamptz
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.notifications
  WHERE type = 'critical_alert_sent'
    AND data->>'organization_id' = _organization_id::text
    AND created_at >= _since;
$$;

GRANT EXECUTE ON FUNCTION public.get_critical_alert_count(uuid, timestamptz) TO authenticated;