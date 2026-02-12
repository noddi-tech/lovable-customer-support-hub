

# Fix: BookingSummaryBlock customer ID re-lookup

## Problem

Issue #1 (verification 400 pass-through) is already fixed in the last deployment. The `400` from Noddi is a genuine validation error for that phone number -- our edge function now correctly passes it through instead of wrapping it as `502`.

Issue #2 remains: When the AI emits `[BOOKING_SUMMARY]{...}[/BOOKING_SUMMARY]`, the JSON often lacks `user_id` and `user_group_id` because the server-side `patchBookingSummary` may fail to inject them (timing, missing phone data, etc.). The `BookingSummaryBlock` frontend component then sends a `create_booking` request without these fields, triggering the proxy's `400: Missing required fields` error.

## Solution

Add a fallback customer lookup directly in the `BookingSummaryBlock` so it can resolve the missing IDs at confirm-time.

### Step 1: Add `lookup_customer` action to `noddi-booking-proxy`

Add a new case in the proxy's switch statement that calls `GET /v1/users/customer-lookup-support/?phone=...` and returns `{ userId, userGroupId }`. This reuses the same endpoint that `widget-ai-chat` uses internally.

```
File: supabase/functions/noddi-booking-proxy/index.ts

New case "lookup_customer":
  - Accept `phone` and/or `email` from the request body
  - Call Noddi's customer-lookup-support endpoint
  - Return { customer: { userId, userGroupId } }
```

### Step 2: Update BookingSummaryBlock to re-lookup if IDs missing

In `handleConfirm()`, before sending `create_booking`:
1. Check if `user_id` or `user_group_id` is missing from `data`
2. If missing, read the verified phone from `localStorage` (key: `noddi_ai_verified_phone`)
3. Call `noddi-booking-proxy` with `action: 'lookup_customer'` and the phone
4. Inject the returned `userId` and `userGroupId` into the booking payload
5. Proceed with `create_booking` as normal

```
File: src/widget/components/blocks/BookingSummaryBlock.tsx

In handleConfirm():
  if (!data.user_id || !data.user_group_id) {
    const phone = localStorage.getItem('noddi_ai_verified_phone');
    if (phone) {
      const lookupResp = await fetch(`${getApiUrl()}/noddi-booking-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup_customer', phone }),
      });
      const lookupData = await lookupResp.json();
      if (lookupData.customer) {
        bookingPayload.user_id = lookupData.customer.userId;
        bookingPayload.user_group_id = lookupData.customer.userGroupId;
      }
    }
  }
```

### Deployments

- Redeploy `noddi-booking-proxy` (new `lookup_customer` action)
- No edge function redeployment needed for `BookingSummaryBlock` (frontend code, auto-builds)
