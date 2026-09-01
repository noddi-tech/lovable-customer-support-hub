select cron.unschedule('aircall-sync-contacts-nightly') where exists (select 1 from cron.job where jobname = 'aircall-sync-contacts-nightly');

select cron.schedule(
  'aircall-sync-contacts-nightly',
  '40 3 * * *',
  $$
  select net.http_post(
    url := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/aircall-sync-contacts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := jsonb_build_object('source', 'cron', 'limit', 250)
  );
  $$
);