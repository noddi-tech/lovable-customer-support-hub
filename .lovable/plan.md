

# Fix Duplicate Customers: Cleanup + Prevention

## Problem

There are 6 duplicate customer records in the database for "Line Drolsum" (ldr.alt2@gmail.com), all with the same email. The search correctly returns all of them -- the issue is duplicate data, not a search bug.

| ID | Created | Phone |
|---|---|---|
| 353caac8... | 2025-11-30 | (none) |
| f4148969... | 2026-01-09 | +47 93 46 86 90 |
| 2696fd9c... | 2026-02-22 | (none) |
| 0a800caa... | 2026-02-22 | +4793468690 |
| 5161124d... | 2026-02-22 | (none) |
| 911bd1a2... | 2026-02-23 | (none) |

## Root Cause

Customer creation paths (inbound email processing, widget chat, manual creation) insert new rows without checking if a customer with the same email already exists in the same organization.

## Plan

### 1. Run deduplication SQL to merge these duplicates now

Keep the most complete record (f4148969, which has both name and phone) and reassign all conversations from the other 5 records to it, then delete the duplicates.

This will be done via a targeted SQL migration that:
- Updates all `conversations.customer_id` references from duplicate IDs to the kept ID
- Updates all `messages` or other tables referencing these customer IDs (if any foreign keys exist)
- Deletes the 5 duplicate rows

### 2. Add a unique constraint to prevent future duplicates

Add a database unique index on `(organization_id, email)` in the `customers` table (partial index, only where email is not null). This prevents any code path from inserting a second customer with the same email in the same org.

### 3. Update customer creation logic to "upsert"

Modify the customer lookup/creation utility so that when a new inbound email or chat arrives, it first searches for an existing customer by email within the organization. If found, it reuses that record (and updates the name/phone if newer data is available). If not found, it creates a new one.

The key files to update are wherever `supabase.from('customers').insert(...)` is called without a prior lookup. This likely includes edge functions handling inbound emails and widget submissions.

## Technical Details

### Migration SQL (Step 1)

```text
-- Keep f4148969-f5c2-4175-9e86-a8976a3d0431 (has name + phone)
-- Reassign conversations from duplicates
UPDATE conversations 
SET customer_id = 'f4148969-f5c2-4175-9e86-a8976a3d0431'
WHERE customer_id IN (
  '353caac8-f540-41d1-8d84-28fa78860fa0',
  '2696fd9c-548b-431b-b730-0e3644ac017e',
  '0a800caa-e914-4ede-bb84-95e823a3eb91',
  '5161124d-1db8-4939-8cda-f519ca9c0cca',
  '911bd1a2-3128-4310-a929-2a73c0ce0619'
);

-- Delete duplicates
DELETE FROM customers 
WHERE id IN (
  '353caac8-f540-41d1-8d84-28fa78860fa0',
  '2696fd9c-548b-431b-b730-0e3644ac017e',
  '0a800caa-e914-4ede-bb84-95e823a3eb91',
  '5161124d-1db8-4939-8cda-f519ca9c0cca',
  '911bd1a2-3128-4310-a929-2a73c0ce0619'
);
```

### Unique index (Step 2)

```text
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_org_email_unique 
ON customers (organization_id, lower(email)) 
WHERE email IS NOT NULL;
```

### Upsert pattern (Step 3)

In edge functions that create customers, replace direct `.insert()` with a lookup-first pattern:

```text
-- Find existing
SELECT id FROM customers 
WHERE organization_id = $org AND lower(email) = lower($email) 
LIMIT 1;

-- If found: use that ID (optionally update name/phone)
-- If not found: INSERT new row
```

## Files to Change

| File | Action |
|---|---|
| New SQL migration | Deduplicate existing records + add unique index |
| Edge functions that insert customers (inbound email, widget, etc.) | Add lookup-before-insert logic |

## Impact

- Immediate: Search for "Line Drolsum" will return 1 result instead of 5-6
- Future: No more duplicate customers created from repeated emails/chats
- All conversation history is preserved (reassigned to the kept record)

