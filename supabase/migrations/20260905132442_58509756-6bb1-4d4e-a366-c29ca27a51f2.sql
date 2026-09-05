CREATE TABLE IF NOT EXISTS public.slack_conversation_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  conversation_id uuid NOT NULL,
  channel_id text NOT NULL,
  message_ts text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, channel_id)
);

GRANT SELECT ON public.slack_conversation_threads TO authenticated;
GRANT ALL ON public.slack_conversation_threads TO service_role;

ALTER TABLE public.slack_conversation_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view slack threads"
  ON public.slack_conversation_threads FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE TABLE IF NOT EXISTS public.slack_notification_dedupe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  dedupe_key text NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_slack_dedupe_last_sent
  ON public.slack_notification_dedupe (last_sent_at);

GRANT ALL ON public.slack_notification_dedupe TO service_role;
ALTER TABLE public.slack_notification_dedupe ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_slack_notification(
  p_conversation_id uuid,
  p_dedupe_key text,
  p_window interval DEFAULT '5 minutes'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claimed boolean := false;
BEGIN
  INSERT INTO public.slack_notification_dedupe (conversation_id, dedupe_key)
  VALUES (p_conversation_id, p_dedupe_key)
  ON CONFLICT (conversation_id, dedupe_key) DO UPDATE
    SET last_sent_at = now()
    WHERE public.slack_notification_dedupe.last_sent_at < now() - p_window
  RETURNING true INTO v_claimed;

  DELETE FROM public.slack_notification_dedupe
  WHERE last_sent_at < now() - INTERVAL '1 day';

  RETURN COALESCE(v_claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_slack_notification(uuid, text, interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_slack_notification(uuid, text, interval) TO service_role;