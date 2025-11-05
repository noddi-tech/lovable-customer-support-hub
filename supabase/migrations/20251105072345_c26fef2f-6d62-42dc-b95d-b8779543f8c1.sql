-- Part 1: Make email column nullable to allow phone-only cache entries
ALTER TABLE noddi_customer_cache 
  ALTER COLUMN email DROP NOT NULL;

-- Part 2: Fix unique indexes to properly handle NULL values
-- Drop the current full unique indexes
DROP INDEX IF EXISTS noddi_cache_phone_org_ux;
DROP INDEX IF EXISTS noddi_cache_email_org_ux;

-- Recreate as partial unique indexes that only enforce uniqueness when values are NOT NULL
-- This allows multiple NULL values while maintaining uniqueness for actual values
CREATE UNIQUE INDEX noddi_cache_phone_org_ux 
  ON noddi_customer_cache (phone, organization_id)
  WHERE phone IS NOT NULL;

CREATE UNIQUE INDEX noddi_cache_email_org_ux 
  ON noddi_customer_cache (email, organization_id)
  WHERE email IS NOT NULL;

-- Part 3: Add data integrity constraint
-- Ensure at least one identifier (phone or email) is always present
ALTER TABLE noddi_customer_cache
  ADD CONSTRAINT at_least_one_identifier 
  CHECK (phone IS NOT NULL OR email IS NOT NULL);