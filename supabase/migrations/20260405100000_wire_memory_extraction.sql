-- Wire memory extraction triggers for both conversation systems

-- 1. Drop FK on customer_memories.source_conversation_id
--    Currently references widget_ai_conversations(id), but we need to store
--    agent conversation UUIDs too. Keep the column, just remove the constraint.
ALTER TABLE public.customer_memories
  DROP CONSTRAINT IF EXISTS customer_memories_source_conversation_id_fkey;

-- 2. Add memories_extracted_at to track which conversations have been processed
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS memories_extracted_at TIMESTAMPTZ;

ALTER TABLE public.widget_ai_conversations
  ADD COLUMN IF NOT EXISTS memories_extracted_at TIMESTAMPTZ;

-- 3. Schedule auto-close-conversations to run every 10 minutes
--    This also triggers memory extraction for closed/stale conversations.
SELECT cron.unschedule('auto-close-conversations')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-close-conversations');

SELECT cron.schedule(
  'auto-close-conversations',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/auto-close-conversations',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);
