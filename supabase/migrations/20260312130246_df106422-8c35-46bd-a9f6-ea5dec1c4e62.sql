
-- Remove old fixed-time digest cron job
SELECT cron.unschedule('slack-daily-digest');

-- Hourly cron for daily digest check (edge function time-gates per org's configured digest_time)
SELECT cron.schedule(
  'slack-daily-digest-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/slack-daily-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE"}'::jsonb,
    body := '{"digest_type": "daily"}'::jsonb
  ) AS request_id;
  $$
);

-- Hourly cron on Mondays for weekly digest check
SELECT cron.schedule(
  'slack-weekly-digest-monday',
  '0 * * * 1',
  $$
  SELECT net.http_post(
    url := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/slack-daily-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE"}'::jsonb,
    body := '{"digest_type": "weekly"}'::jsonb
  ) AS request_id;
  $$
);
