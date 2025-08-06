-- Add auto-sync columns to email_accounts table
ALTER TABLE public.email_accounts 
ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS sync_interval_minutes integer NOT NULL DEFAULT 2;

-- Update the cron job to only sync accounts with auto_sync_enabled = true
-- First, remove the old cron job
SELECT cron.unschedule('gmail-auto-sync');

-- Create new cron job that checks for enabled accounts
SELECT cron.schedule(
  'gmail-auto-sync-selective',
  '*/1 * * * *', -- Check every minute
  $$
  WITH enabled_accounts AS (
    SELECT DISTINCT sync_interval_minutes
    FROM public.email_accounts 
    WHERE auto_sync_enabled = true 
    AND is_active = true
    AND (
      -- Sync accounts based on their individual intervals
      (sync_interval_minutes = 1) OR
      (sync_interval_minutes = 2 AND EXTRACT(MINUTE FROM NOW()) % 2 = 0) OR
      (sync_interval_minutes = 5 AND EXTRACT(MINUTE FROM NOW()) % 5 = 0) OR
      (sync_interval_minutes = 10 AND EXTRACT(MINUTE FROM NOW()) % 10 = 0) OR
      (sync_interval_minutes = 15 AND EXTRACT(MINUTE FROM NOW()) % 15 = 0) OR
      (sync_interval_minutes = 30 AND EXTRACT(MINUTE FROM NOW()) % 30 = 0) OR
      (sync_interval_minutes = 60 AND EXTRACT(MINUTE FROM NOW()) = 0)
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

-- Drop the global email_sync_settings table as it's no longer needed
DROP TABLE IF EXISTS public.email_sync_settings;