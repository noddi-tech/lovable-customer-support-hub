-- Remove existing cron job for email sync
SELECT cron.unschedule('email-sync-scheduler');

-- Create a new cron job that runs every second to accommodate the shortest sync interval (1 sec)
SELECT cron.schedule(
  'email-sync-scheduler',
  '* * * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/email-sync-scheduler',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE"}'::jsonb,
      body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);