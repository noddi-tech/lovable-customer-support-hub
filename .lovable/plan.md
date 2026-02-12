

# Fix: Booking Proxy Payload Mismatches and Verification Error Handling

## Summary of Issues Found

After reviewing the Noddi API schema (207k lines), I found **three critical issues** causing the booking flow to fail:

### Issue 1: Booking creation payload field names are wrong (noddi-booking-proxy)

The `create_booking` action in `noddi-booking-proxy/index.ts` sends incorrect field names to `POST /v1/bookings/`.

| What we send | What API expects | 
|---|---|
| `user: user_id` | `user_id: user_id` |
| `user_group: user_group_id` | `user_group_id: user_group_id` |
| `delivery_window: { delivery_window: id, ... }` | `delivery_window: { id: id, ... }` |

The API schema (`BookingRecordCreate`) requires:
- `user_id` (not `user`)
- `user_group_id` (not `user_group`)
- `delivery_window.id` (not `delivery_window.delivery_window`)

This means even when `patchBookingSummary` successfully injects the IDs, the proxy mangles the field names before sending to Noddi.

### Issue 2: Shopping cart endpoint is deprecated

The `BookingSummaryBlock` component references `shopping-cart-for-new-booking` in its API config metadata. The schema marks this endpoint as **deprecated**: "Use the discounts_for_shopping_cart_api endpoint instead." Our proxy already uses `POST /v1/bookings/` directly, so this is just a metadata/documentation issue -- no runtime impact.

### Issue 3: Verification error wrapping (widget-send-verification)

The function returns `502` for all upstream failures, including `400` validation errors from Noddi. The `400` should be passed through to give users a clear error message instead of "Internal server error."

## Changes

### File 1: `supabase/functions/noddi-booking-proxy/index.ts`

Fix the `create_booking` payload to match the API schema:

```typescript
// Before (WRONG):
const cartPayload = {
  address_id,
  user: user_id,
  user_group: user_group_id,
  delivery_window: { delivery_window: delivery_window_id, starts_at: ..., ends_at: ... },
  cars: [...]
};

// After (CORRECT):
const cartPayload = {
  address_id,
  user_id: user_id,
  user_group_id: user_group_id,
  delivery_window: { id: delivery_window_id, starts_at: ..., ends_at: ... },
  cars: [...]
};
```

### File 2: `supabase/functions/widget-send-verification/index.ts`

- Pass through `400` status from Noddi instead of wrapping as `502`
- Provide a user-friendly error message for phone validation failures
- Only use `502` for actual upstream server errors (5xx)

### Deployments

- Redeploy `noddi-booking-proxy`
- Redeploy `widget-send-verification`
