

# Fix: Booking payload field names

## Problem

The `noddi-booking-proxy` edge function on lines 215-217 renames the incoming fields incorrectly:

```typescript
address: address_id,      // API wants "address_id", not "address"
user: user_id,            // API wants "user_id", not "user"
user_group: user_group_id // API wants "user_group_id", not "user_group"
```

The Noddi API explicitly requires `address_id`, `user_id`, and `user_group_id` as field names.

## Fix

**File**: `supabase/functions/noddi-booking-proxy/index.ts` (lines 213-218)

Replace the payload construction to keep the `_id` suffix:

```typescript
const cartPayload: any = {
  ...rest,
  address_id: address_id,
  user_id: user_id,
  user_group_id: user_group_id,
  delivery_window: delivery_window_id,
  cars: [
    ...
  ],
};
```

Note: `delivery_window` stays as-is for now since the API hasn't complained about that field name.

## Deployment

- Redeploy `noddi-booking-proxy` edge function
