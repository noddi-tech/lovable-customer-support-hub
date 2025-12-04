-- Schedule SLA breach notifier to run every 15 minutes
-- First unschedule any existing job with same name
SELECT cron.unschedule('sla-breach-notifier-job') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sla-breach-notifier-job'
);

-- Schedule the new job
SELECT cron.schedule(
  'sla-breach-notifier-job',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/sla-breach-notifier',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);