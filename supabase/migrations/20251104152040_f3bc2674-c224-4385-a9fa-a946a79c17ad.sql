-- Clear "Unknown Customer" names to force re-sync on next view
-- This will trigger syncCustomerFromNoddi with our improved name extraction logic

UPDATE calls
SET 
  customer_name = NULL,
  updated_at = NOW()
WHERE customer_name IN ('Unknown Customer', 'Unknown', '')
  AND hidden = false;

UPDATE customers
SET 
  full_name = NULL,
  updated_at = NOW()
WHERE full_name IN ('Unknown Customer', 'Unknown', '');