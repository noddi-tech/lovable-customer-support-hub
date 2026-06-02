DO $$ BEGIN
  PERFORM cron.unschedule('gdpr-cleanup-expired-exports-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'gdpr-cleanup-expired-exports-daily',
  '25 3 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/cleanup-expired-gdpr-exports',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE'
    ),
    body := jsonb_build_object('triggered_at', now())
  );
  $cron$
);