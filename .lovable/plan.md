

# Fix: Customer lookup broken after API endpoint switch

## Root Cause
The last edit replaced the API URL from `/v1/users/customer-lookup-support/` to `/v1/users/user-customer-lookup-summary/`. The logs clearly show:
- **14:31** — Old endpoint (`customer-lookup-support`) found `ingvaldsenstig@gmail.com` successfully
- **14:38** — New endpoint (`user-customer-lookup-summary`) returns "not found" for the **same** email

The new endpoint is either not deployed yet on Noddi's side, expects different parameters, or has a different response format.

## Fix — Add fallback with old endpoint

**File: `supabase/functions/noddi-customer-lookup/index.ts`**

In the lookup loop (around line 895-956), after the new endpoint returns a "user not found" error, **fall back to the old endpoint** before giving up:

1. Try `user-customer-lookup-summary` first (GET with `email`/`phone`/`clear_cache` query params)
2. If it returns 400/404 `user_does_not_exist`, retry with the old `customer-lookup-support` endpoint using the same query params
3. If the old endpoint works, use its response and log that the fallback was used
4. Keep all existing response parsing and `buildResponse` logic intact — both endpoints return the same shape

This ensures the system works regardless of which endpoint is active on Noddi's side.

## Also: incorporate the earlier plan (pass `noddi_user_id` for name-search linking)

Since we're already fixing the edge function, include the earlier approved plan items:

**Edge function**: Accept optional `noddi_user_id` and `user_group_id` params. If email/phone lookup fails but these IDs are provided, fetch user data directly via `/v1/users/{id}/` and `/v1/user-groups/{id}/` as a secondary fallback.

**ChatCustomerPanel.tsx / CustomerSidePanel.tsx**: Pass `noddi_user_id` and `user_group_id` from customer metadata when calling the lookup after linking a name-search result.

### Files to modify
- `supabase/functions/noddi-customer-lookup/index.ts` — add old-endpoint fallback + `noddi_user_id` direct-lookup fallback
- `src/components/dashboard/chat/ChatCustomerPanel.tsx` — pass metadata IDs in lookup call
- `src/components/dashboard/conversation-view/CustomerSidePanel.tsx` — same

