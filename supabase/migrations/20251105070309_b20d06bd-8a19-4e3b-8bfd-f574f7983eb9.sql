-- Add the missing compound unique constraints for multi-org support on noddi_customer_cache
-- These constraints are required for the onConflict upsert operations to work

CREATE UNIQUE INDEX IF NOT EXISTS noddi_cache_phone_org_ux 
  ON noddi_customer_cache (phone, organization_id)
  WHERE phone IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS noddi_cache_email_org_ux 
  ON noddi_customer_cache (email, organization_id)
  WHERE email IS NOT NULL;