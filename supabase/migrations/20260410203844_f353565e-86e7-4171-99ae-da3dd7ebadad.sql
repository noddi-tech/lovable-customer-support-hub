ALTER TABLE public.inbox_slack_routing
ADD COLUMN digest_channel_id text,
ADD COLUMN digest_channel_name text,
ADD COLUMN digest_use_secondary boolean DEFAULT false,
ADD COLUMN critical_channel_id text,
ADD COLUMN critical_channel_name text,
ADD COLUMN critical_use_secondary boolean DEFAULT false;