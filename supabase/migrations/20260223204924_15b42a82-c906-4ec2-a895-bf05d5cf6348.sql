
-- Mass deduplicate ALL customers with duplicate (organization_id, lower(email))

-- Step 1: Reassign conversations
WITH duplicates AS (
  SELECT id, 
    FIRST_VALUE(id) OVER (PARTITION BY organization_id, lower(email) ORDER BY created_at ASC) as keep_id,
    ROW_NUMBER() OVER (PARTITION BY organization_id, lower(email) ORDER BY created_at ASC) as rn
  FROM customers
  WHERE email IS NOT NULL
)
UPDATE conversations c
SET customer_id = d.keep_id
FROM duplicates d
WHERE c.customer_id = d.id AND d.rn > 1;

-- Step 2: Reassign calls
WITH duplicates AS (
  SELECT id, 
    FIRST_VALUE(id) OVER (PARTITION BY organization_id, lower(email) ORDER BY created_at ASC) as keep_id,
    ROW_NUMBER() OVER (PARTITION BY organization_id, lower(email) ORDER BY created_at ASC) as rn
  FROM customers
  WHERE email IS NOT NULL
)
UPDATE calls c
SET customer_id = d.keep_id
FROM duplicates d
WHERE c.customer_id = d.id AND d.rn > 1;

-- Step 3: Update noddi_customer_cache references (customer_id is text, cast needed)
WITH duplicates AS (
  SELECT id, 
    FIRST_VALUE(id) OVER (PARTITION BY organization_id, lower(email) ORDER BY created_at ASC) as keep_id,
    ROW_NUMBER() OVER (PARTITION BY organization_id, lower(email) ORDER BY created_at ASC) as rn
  FROM customers
  WHERE email IS NOT NULL
)
UPDATE noddi_customer_cache ncc
SET customer_id = d.keep_id::text
FROM duplicates d
WHERE ncc.customer_id = d.id::text AND d.rn > 1;

-- Step 4: Delete all duplicate customer records
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY organization_id, lower(email) ORDER BY created_at ASC) as rn
  FROM customers
  WHERE email IS NOT NULL
)
DELETE FROM customers
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Step 5: Add unique index
CREATE UNIQUE INDEX idx_customers_org_email_unique 
ON customers (organization_id, lower(email)) 
WHERE email IS NOT NULL;
