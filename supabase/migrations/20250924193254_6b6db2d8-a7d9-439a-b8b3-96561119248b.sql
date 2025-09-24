-- Generate a proper secret token for the hei@inbound.noddi.no route
-- Use the same token from SENDGRID_INBOUND_TOKEN secret
UPDATE inbound_routes 
SET secret_token = 'secure_webhook_token_2024_v1' 
WHERE address = 'hei@inbound.noddi.no';