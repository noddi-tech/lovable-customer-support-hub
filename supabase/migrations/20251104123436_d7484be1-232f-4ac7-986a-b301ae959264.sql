-- Add unique constraint on customers table for phone + organization_id
-- This allows upserting customer records when syncing from Noddi API

-- First, check if constraint already exists and drop it if it does
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_phone_org_unique'
  ) THEN
    ALTER TABLE public.customers DROP CONSTRAINT customers_phone_org_unique;
  END IF;
END $$;

-- Add the unique constraint
-- Note: This will fail if there are duplicate (phone, organization_id) pairs
-- In that case, duplicate records should be cleaned up first
ALTER TABLE public.customers 
ADD CONSTRAINT customers_phone_org_unique 
UNIQUE (phone, organization_id);

-- Add index for better performance on upserts
CREATE INDEX IF NOT EXISTS idx_customers_phone_org 
ON public.customers (phone, organization_id) 
WHERE phone IS NOT NULL;

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT customers_phone_org_unique ON public.customers IS 
'Ensures one customer record per phone number per organization, enabling upsert operations when syncing from external APIs like Noddi';