-- Drop the CORRECT existing unique constraints (single column)
-- These were never dropped in the previous migration due to wrong index names
DROP INDEX IF EXISTS noddi_cache_phone_ux;
DROP INDEX IF EXISTS noddi_cache_email_ux;

-- Note: The compound unique constraints already exist from the previous migration:
-- - noddi_cache_phone_org_ux on (phone, organization_id)
-- - noddi_cache_email_org_ux on (email, organization_id)