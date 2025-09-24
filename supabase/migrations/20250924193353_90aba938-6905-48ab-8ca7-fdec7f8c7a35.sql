-- Update the secret_token to match the actual SENDGRID_INBOUND_TOKEN secret
-- First, let's set it to the expected format that should match the secret
UPDATE inbound_routes 
SET secret_token = 'SENDGRID_INBOUND_TOKEN_VALUE_TO_BE_VERIFIED' 
WHERE address = 'hei@inbound.noddi.no';