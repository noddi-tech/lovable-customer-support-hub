-- Sync all inbound_routes.secret_token to match SENDGRID_INBOUND_TOKEN
UPDATE public.inbound_routes 
SET secret_token = 'asdaasdjoijaosdijoijasd91281237123',
    updated_at = now()
WHERE secret_token IS NULL 
   OR secret_token != 'asdaasdjoijaosdijoijasd91281237123';