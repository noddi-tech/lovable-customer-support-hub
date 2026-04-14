

# Fix: "Failed to link customer" Error

## Root Cause

Two bugs in `CustomerSidePanel.tsx` `handleSelectCustomer`:

1. **Missing `local_customer_id` in metadata**: The `NoddiCustomerSearch` component stores `local_customer_id` in the top-level `id` field (line 80) but does NOT include it in `metadata`. When the conversation has no existing customer and `is_new` is false, the code at line 313 does:
   ```
   customerId = selectedCustomer.metadata?.local_customer_id || selectedCustomer.id
   ```
   `metadata.local_customer_id` is always `undefined`, so it falls back to `selectedCustomer.id` which is `"noddi-123"` — an invalid UUID. Any subsequent Supabase query with this ID fails.

2. **Noddi lookup failure blocks linking**: Even when the conversation already has a customer, the `noddi-customer-lookup` call at line 359-368 can fail (network error, edge function error), and `throw lookupError` at line 370 aborts the entire operation — even though the customer was already successfully linked at line 346-349.

## Fix

### File: `src/components/shared/NoddiCustomerSearch.tsx`
- Add `local_customer_id: result.local_customer_id` to the metadata object (line 84-92) so it's available downstream

### File: `src/components/dashboard/conversation-view/CustomerSidePanel.tsx`
- **Fix ID resolution** (line 311-314): When `is_new` is false and `selectedCustomer.id` starts with `noddi-`, create a new customer record in the database instead of using the invalid ID
- **Make Noddi lookup non-fatal** (line 370): Wrap the lookup in a try/catch so that a failed enrichment doesn't prevent the customer from being linked. Show a warning toast instead of throwing

### Files to modify
- `src/components/shared/NoddiCustomerSearch.tsx` — pass `local_customer_id` in metadata
- `src/components/dashboard/conversation-view/CustomerSidePanel.tsx` — handle `noddi-` IDs gracefully, make lookup non-fatal

