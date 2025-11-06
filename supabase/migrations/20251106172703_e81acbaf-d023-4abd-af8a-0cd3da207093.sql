-- One-time data migration: Set Aircall domain to production domain
-- This ensures Aircall Everywhere SDK works correctly on support.noddi.co

UPDATE voice_integrations 
SET configuration = jsonb_set(
  configuration, 
  '{aircallEverywhere,domainName}', 
  '"support.noddi.co"'
)
WHERE provider = 'aircall' 
  AND organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b';