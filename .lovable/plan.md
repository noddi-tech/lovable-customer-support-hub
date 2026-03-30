

## Fix: Membership Programs & Coupons Not Showing After Refresh

### Root Cause
The refresh button in `NoddiCustomerDetails` only invalidates the **React Query client-side cache** and refetches — but the refetch goes through the normal `queryFn` which does NOT pass `forceRefresh: true` to the edge function. So the edge function returns its **server-side cached** response (v1.7, which predates the membership/coupons update).

The `useNoddihKundeData` hook already has a `refreshMutation` that correctly passes `forceRefresh: true`, but `NoddiCustomerDetails` doesn't use it.

Your screenshot confirms this: it shows `vnoddi-edge-1.7` — the old cached version — instead of `1.8`.

### Fix

| # | File | Change |
|---|------|--------|
| 1 | `src/components/dashboard/voice/NoddiCustomerDetails.tsx` | Replace the custom `handleForceRefresh` with calling the `refresh` function from `useNoddihKundeData` (which passes `forceRefresh: true`), so the edge function bypasses its server-side cache and returns fresh v1.8 data with membership programs and coupons |

### What happens after the fix
1. User clicks the refresh button
2. `useNoddihKundeData.refresh()` is called → sends `forceRefresh: true` to the edge function
3. Edge function bypasses its server-side cache → calls Noddi API live → returns v1.8 response with `membership_programs` and `coupons`
4. React Query cache is updated → UI re-renders with the new sections

This is a one-line behavioral fix. Once refreshed, the membership programs ("Tire hotel customer") and coupons will appear.

