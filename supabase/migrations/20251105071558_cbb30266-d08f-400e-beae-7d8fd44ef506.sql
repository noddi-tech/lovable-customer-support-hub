-- Drop the partial unique indexes that prevent onConflict from working
DROP INDEX IF EXISTS noddi_cache_phone_org_ux;
DROP INDEX IF EXISTS noddi_cache_email_org_ux;

-- Create full unique indexes without WHERE clauses
-- These will work with onConflict: 'phone,organization_id'
CREATE UNIQUE INDEX noddi_cache_phone_org_ux 
  ON noddi_customer_cache (phone, organization_id);

CREATE UNIQUE INDEX noddi_cache_email_org_ux 
  ON noddi_customer_cache (email, organization_id);