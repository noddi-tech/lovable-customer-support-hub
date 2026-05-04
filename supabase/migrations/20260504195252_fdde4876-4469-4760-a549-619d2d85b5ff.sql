SELECT cron.schedule(
  'meta-token-health-check-daily',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/meta-token-health-check',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE"}'::jsonb,
    body:='{"trigger":"cron"}'::jsonb
  );
  $$
);