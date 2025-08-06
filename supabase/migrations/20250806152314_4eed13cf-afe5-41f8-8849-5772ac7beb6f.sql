-- Update the cron job to handle smaller sync intervals (seconds to 5 minutes)
-- Remove the old cron job
SELECT cron.unschedule('gmail-auto-sync-selective');

-- Create new cron job that runs every 5 seconds to check for enabled accounts
SELECT cron.schedule(
  'gmail-auto-sync-precise',
  '*/5 * * * * *', -- Check every 5 seconds
  $$
  WITH enabled_accounts AS (
    SELECT DISTINCT sync_interval_minutes
    FROM public.email_accounts 
    WHERE auto_sync_enabled = true 
    AND is_active = true
    AND (
      -- Handle fractional minutes (seconds) and regular minutes
      (sync_interval_minutes = 0.017 AND EXTRACT(EPOCH FROM NOW()) % 1 < 0.1) OR -- 1 second
      (sync_interval_minutes = 0.083 AND EXTRACT(EPOCH FROM NOW()) % 5 < 0.1) OR -- 5 seconds
      (sync_interval_minutes = 0.167 AND EXTRACT(EPOCH FROM NOW()) % 10 < 0.1) OR -- 10 seconds
      (sync_interval_minutes = 0.5 AND EXTRACT(EPOCH FROM NOW()) % 30 < 0.1) OR -- 30 seconds
      (sync_interval_minutes = 1 AND EXTRACT(EPOCH FROM NOW()) % 60 < 5) OR -- 1 minute
      (sync_interval_minutes = 2 AND EXTRACT(EPOCH FROM NOW()) % 120 < 5) OR -- 2 minutes
      (sync_interval_minutes = 5 AND EXTRACT(EPOCH FROM NOW()) % 300 < 5) -- 5 minutes
    )
  )
  SELECT
    net.http_post(
        url:='https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/gmail-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE"}'::jsonb,
        body:='{"syncSent": true, "autoSyncOnly": true}'::jsonb
    ) as request_id
  WHERE EXISTS (SELECT 1 FROM enabled_accounts);
  $$
);