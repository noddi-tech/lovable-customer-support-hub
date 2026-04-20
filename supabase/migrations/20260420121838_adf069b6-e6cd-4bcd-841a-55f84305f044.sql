-- Add Tech/Ops bucket routing + category mapping override to slack_integrations
ALTER TABLE public.slack_integrations
  ADD COLUMN IF NOT EXISTS critical_tech_subteam_id text,
  ADD COLUMN IF NOT EXISTS critical_tech_subteam_handle text,
  ADD COLUMN IF NOT EXISTS critical_tech_user_id text,
  ADD COLUMN IF NOT EXISTS critical_tech_mention_mode text DEFAULT 'channel',
  ADD COLUMN IF NOT EXISTS critical_ops_subteam_id text,
  ADD COLUMN IF NOT EXISTS critical_ops_subteam_handle text,
  ADD COLUMN IF NOT EXISTS critical_ops_user_id text,
  ADD COLUMN IF NOT EXISTS critical_ops_mention_mode text DEFAULT 'channel',
  ADD COLUMN IF NOT EXISTS critical_category_routing jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Validate mention modes via trigger (CHECK constraints are too rigid for future modes)
CREATE OR REPLACE FUNCTION public.validate_slack_mention_modes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.critical_tech_mention_mode IS NOT NULL
     AND NEW.critical_tech_mention_mode NOT IN ('channel', 'subteam', 'user', 'none') THEN
    RAISE EXCEPTION 'Invalid critical_tech_mention_mode: %', NEW.critical_tech_mention_mode;
  END IF;
  IF NEW.critical_ops_mention_mode IS NOT NULL
     AND NEW.critical_ops_mention_mode NOT IN ('channel', 'subteam', 'user', 'none') THEN
    RAISE EXCEPTION 'Invalid critical_ops_mention_mode: %', NEW.critical_ops_mention_mode;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_slack_mention_modes_trigger ON public.slack_integrations;
CREATE TRIGGER validate_slack_mention_modes_trigger
  BEFORE INSERT OR UPDATE ON public.slack_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_slack_mention_modes();

-- Mirror per-inbox override columns on inbox_slack_routing
ALTER TABLE public.inbox_slack_routing
  ADD COLUMN IF NOT EXISTS critical_tech_subteam_id text,
  ADD COLUMN IF NOT EXISTS critical_tech_subteam_handle text,
  ADD COLUMN IF NOT EXISTS critical_tech_user_id text,
  ADD COLUMN IF NOT EXISTS critical_tech_mention_mode text,
  ADD COLUMN IF NOT EXISTS critical_ops_subteam_id text,
  ADD COLUMN IF NOT EXISTS critical_ops_subteam_handle text,
  ADD COLUMN IF NOT EXISTS critical_ops_user_id text,
  ADD COLUMN IF NOT EXISTS critical_ops_mention_mode text;

CREATE OR REPLACE FUNCTION public.validate_inbox_slack_mention_modes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.critical_tech_mention_mode IS NOT NULL
     AND NEW.critical_tech_mention_mode NOT IN ('channel', 'subteam', 'user', 'none') THEN
    RAISE EXCEPTION 'Invalid critical_tech_mention_mode: %', NEW.critical_tech_mention_mode;
  END IF;
  IF NEW.critical_ops_mention_mode IS NOT NULL
     AND NEW.critical_ops_mention_mode NOT IN ('channel', 'subteam', 'user', 'none') THEN
    RAISE EXCEPTION 'Invalid critical_ops_mention_mode: %', NEW.critical_ops_mention_mode;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_inbox_slack_mention_modes_trigger ON public.inbox_slack_routing;
CREATE TRIGGER validate_inbox_slack_mention_modes_trigger
  BEFORE INSERT OR UPDATE ON public.inbox_slack_routing
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_inbox_slack_mention_modes();