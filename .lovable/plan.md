

# Fix: Noddi API field name mismatches causing booking creation failure

## Problem

The Noddi API POST `/v1/bookings/` expects specific field names that differ from what the proxy currently sends. The error reveals 3 issues:

1. **`user`** is required -- proxy sends `user_id` but API expects `user` (integer)
2. **`user_group`** is required -- proxy sends `user_group_id` but API expects `user_group` (integer)  
3. **`delivery_window.delivery_window`** is required -- the API expects the delivery window ID in a nested field called `delivery_window` inside the `delivery_window` object (i.e., `{"delivery_window": {"delivery_window": 679, "starts_at": "...", "ends_at": "..."}}`)

Additionally, the AI sometimes omits `user_id`, `user_group_id`, and `delivery_window_id` from the BOOKING_SUMMARY JSON entirely.

## Changes

### 1. Edge function: `supabase/functions/noddi-booking-proxy/index.ts`

Update the `cartPayload` construction in the `create_booking` case to use the correct Noddi API field names:

```typescript
const cartPayload: any = {
  ...rest,
  address: address_id,          // was address_id
  user: user_id,                // was user_id
  user_group: user_group_id,    // was user_group_id
  delivery_window: {
    delivery_window: delivery_window_id,  // was "id"
    starts_at: delivery_window_start,
    ends_at: delivery_window_end,
  },
  cars: [ ... ],
};
```

### 2. Redeploy `noddi-booking-proxy`

No other file changes needed -- the AI prompt and frontend component are already correct.
