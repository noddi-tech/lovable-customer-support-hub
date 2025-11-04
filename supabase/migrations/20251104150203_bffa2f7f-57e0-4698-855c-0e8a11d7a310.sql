-- Add customer data columns directly to calls table for immediate display
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Backfill customer data from customers table for existing calls
UPDATE calls 
SET 
  customer_name = c.full_name,
  customer_email = c.email
FROM customers c
WHERE calls.customer_id = c.id
  AND calls.customer_name IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_calls_customer_name ON calls(customer_name) 
WHERE customer_name IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN calls.customer_name IS 'Denormalized customer name for immediate display without JOIN';
COMMENT ON COLUMN calls.customer_email IS 'Denormalized customer email for immediate display without JOIN';