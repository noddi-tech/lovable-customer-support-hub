-- Add phone column to noddi_customer_cache
ALTER TABLE noddi_customer_cache ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create phone index for performance
CREATE INDEX IF NOT EXISTS idx_noddi_cache_phone ON noddi_customer_cache(phone);

-- Drop existing unique constraint on email (this will also drop the associated index)
ALTER TABLE noddi_customer_cache DROP CONSTRAINT IF EXISTS noddi_customer_cache_email_key;

-- Create partial unique indexes for both email and phone to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS noddi_cache_email_ux ON noddi_customer_cache (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS noddi_cache_phone_ux ON noddi_customer_cache (phone) WHERE phone IS NOT NULL;