

# Fix: delivery_window needs starts_at and ends_at

## Problem

The Noddi API requires the `delivery_window` object to include `starts_at` and `ends_at` timestamps, not just the `id`.

## Fix

**File**: `supabase/functions/noddi-booking-proxy/index.ts`

In the `create_booking` case, destructure `delivery_window_start` and `delivery_window_end` from the request body and include them in the payload:

```typescript
const { action: _a, address_id, user_id, user_group_id,
        license_plate, country_code, sales_item_ids,
        delivery_window_id, delivery_window_start, delivery_window_end, ...rest } = body;

const cartPayload: any = {
  ...rest,
  address_id,
  user_id,
  user_group_id,
  delivery_window: {
    id: delivery_window_id,
    starts_at: delivery_window_start,
    ends_at: delivery_window_end,
  },
  cars: [ ... ],
};
```

**File**: `supabase/functions/widget-ai-chat/index.ts`

Update the BOOKING_SUMMARY instructions to include `delivery_window_start` and `delivery_window_end` fields so the AI passes the time slot start/end timestamps (which it already has from the TIME_SLOT selection) into the booking confirmation payload.

## Deployment

- Redeploy both `noddi-booking-proxy` and `widget-ai-chat` edge functions

