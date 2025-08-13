-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the timezone-aware snooze checker to run every 5 minutes
SELECT cron.schedule(
  'timezone-aware-snooze-checker',
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT net.http_post(
    url:='https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/timezone-aware-scheduler',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAzMjAwMywiZXhwIjoyMDY5NjA4MDAzfQ.OLmGU2M-8hCWQaFBOTJHdLojVGI7ZCBjB0bMN8Qvhms"}'::jsonb,
    body:=concat('{"scheduled_at": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);