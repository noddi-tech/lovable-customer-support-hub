-- Per-widget toggle for the visitor-facing AI chat assistant. Defaults to
-- false so existing widgets keep their current (human live-chat) behaviour
-- until an admin (or the host app, via the init flag) opts in.
ALTER TABLE public.widget_configs
  ADD COLUMN IF NOT EXISTS enable_ai_chat BOOLEAN NOT NULL DEFAULT false;
