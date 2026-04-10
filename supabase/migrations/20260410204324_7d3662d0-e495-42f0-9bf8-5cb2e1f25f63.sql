ALTER TABLE public.inbox_slack_routing
  ADD COLUMN digest_enabled boolean DEFAULT true,
  ADD COLUMN critical_enabled boolean DEFAULT true;