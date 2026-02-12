
# Fix: Use Correct Noddi Booking Endpoint

## Problem

The proxy uses `POST /v1/bookings/shopping-cart-for-new-booking/` but the actual Noddi API uses `POST /v1/bookings/` to create bookings (confirmed by the user's network inspection showing a `201 Created` response from that endpoint).

## Change

**File: `supabase/functions/noddi-booking-proxy/index.ts` (line 224)**

Change the endpoint URL from:
```
${API_BASE}/v1/bookings/shopping-cart-for-new-booking/
```
to:
```
${API_BASE}/v1/bookings/
```

Also update the comment on line 205 to reflect the correct endpoint.

Additionally, log the full error response body on failure so we can debug any remaining payload format issues.

## Deployment

Redeploy `noddi-booking-proxy` edge function.
