

# Fix: "Failed to link customer" — duplicate email constraint

## Root cause

Console shows:
```
[CustomerSync] Error syncing customer: code 23505
"duplicate key value violates unique constraint idx_customers_org_email_unique"
```

The DB has a unique index on `(organization_id, lower(email))`. There are TWO independent issues blocking customer linking:

### Issue 1 — `syncCustomerFromNoddi` upsert can't resolve cross-constraint conflicts
In `src/utils/customerSync.ts`, the upsert uses `onConflict: 'phone,organization_id'`. When the (phone, org) pair doesn't match an existing row, Postgres tries an INSERT — but if another customer in that org already has the same email (created earlier from an inbound email), the email-unique index throws 23505. Postgres can only resolve ONE conflict target per upsert, so this is structural.

Confirmed in DB for the current case:
- Existing customer `5327061e-…` has `email=heidiosthagen@hotmail.com`, `phone=null`, `full_name=heidiosthagen@hotmail.com` (stub from inbound email, created Nov 30)
- Noddi returns Heidi with same email + a real phone → INSERT attempt → 23505

### Issue 2 — `CustomerSidePanel.handleSelectCustomer` links to the wrong customer
The current conversation `9f0b51cb-…` already has `customer_id` set to **Unni** (`9f01a028-…`) for some unrelated reason (likely a stale/earlier link). When the agent searches "Heidi Østhagen" and clicks her name:

```ts
const conversationCustomerId = conversation.customer_id;   // Unni
let customerId = conversationCustomerId;
if (!conversationCustomerId) { /* skipped */ }
// Step 4
if (customerId !== conversationCustomerId) { /* skipped — they're equal */ }
```

The selected Noddi customer is never actually linked. The `noddi_email` from Heidi gets appended to **Unni's** `alternative_emails` (data corruption), and the conversation keeps pointing at Unni.

## Fix

### File: `src/utils/customerSync.ts`
Make `syncCustomerFromNoddi` resilient to the email-unique conflict:

1. Before upserting by `(phone, organization_id)`, check whether a customer with the same `lower(email)` already exists in the org.
2. If yes → **UPDATE that existing row** (set phone, full_name, metadata, updated_at) instead of inserting a new one. Also write to `calls` if `callId` is provided.
3. If no → keep the current upsert behaviour.
4. Catch 23505 specifically and fall through to a "find-by-email then update" recovery path so we never fail the parent flow.

### File: `src/components/dashboard/conversation-view/CustomerSidePanel.tsx` (`handleSelectCustomer`)
Always honour the agent's explicit selection:

1. Resolve the **selected** customer first (by `local_customer_id`, by `noddi_user_id` lookup in `customers`, or create new) — independent of `conversation.customer_id`.
2. If the resolved customer differs from `conversation.customer_id`, swap the link (`UPDATE conversations SET customer_id = <selected>`).
3. Only append `noddi_email` to the resolved (selected) customer's `alternative_emails` — never to whichever customer happens to be on the conversation.
4. When creating a new customer (the `is_new` path), first check by `(organization_id, lower(email))` and reuse if found, instead of blind INSERT (this also avoids 23505 in the side-panel flow).

### Optional cleanup (not strictly required to unblock)
The conversation `9f0b51cb-…` is currently mis-linked to Unni. After the fix, the agent simply re-clicks "Link" on Heidi and the conversation will repoint to Heidi's record. No migration needed.

## Files to modify
- `src/utils/customerSync.ts` — handle email-unique conflict via find-then-update
- `src/components/dashboard/conversation-view/CustomerSidePanel.tsx` — honour selected customer over existing `customer_id`, and reuse-by-email instead of blind insert

