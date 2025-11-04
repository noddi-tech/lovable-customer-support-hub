-- Drop existing unique constraints that don't include organization_id
DROP INDEX IF EXISTS noddi_customer_cache_phone_key;
DROP INDEX IF EXISTS noddi_customer_cache_email_key;

-- Add compound unique constraints to allow multi-org caching
CREATE UNIQUE INDEX noddi_cache_phone_org_ux 
  ON noddi_customer_cache (phone, organization_id) 
  WHERE phone IS NOT NULL;

CREATE UNIQUE INDEX noddi_cache_email_org_ux 
  ON noddi_customer_cache (email, organization_id) 
  WHERE email IS NOT NULL;