

# Fix: Filter Stored Cars to Only Show the Verified User's Own Vehicles

## Problem

The `executeLookupCustomer` function in `widget-ai-chat` fetches cars from `/v1/user-groups/{userGroupId}/cars/`, which returns **all cars in the user group** -- including vehicles belonging to other members of a shared or company group. This means the AI chatbot shows cars that don't belong to the logged-in customer.

## Solution

Instead of fetching all cars from the user-group endpoint, extract cars **only from the customer's own bookings**. The bookings are already fetched and filtered by the user group, and each booking contains the car(s) used. This is a more reliable source of "my cars" since these are vehicles the customer has actually used.

## Changes

**File: `supabase/functions/widget-ai-chat/index.ts`** (lines ~477-504)

1. **Remove the `/v1/user-groups/{id}/cars/` fetch entirely** -- this is the source of the wrong cars
2. **Keep only the booking-based car extraction** (lines 507-542) which already iterates bookings and extracts `b.car` and `b.cars` entries
3. The booking extraction already deduplicates using a `Map` keyed by `car.id`

This means stored cars will only include vehicles the customer has previously booked with, which is the correct behavior for "Dine lagrede biler" (Your saved cars).

### Before
```text
1. Fetch ALL cars from /v1/user-groups/{id}/cars/  <-- includes other people's cars
2. Also extract cars from bookings (fallback)
```

### After
```text
1. Extract cars from the customer's own bookings only
```

## Technical Detail

The removed block is lines 477-504 in `widget-ai-chat/index.ts`:
```typescript
// DELETE THIS BLOCK:
if (userGroupId) {
  try {
    const carsResp = await fetch(`${API_BASE}/v1/user-groups/${userGroupId}/cars/`, { headers });
    // ... processes all cars in the group
  } catch { ... }
}
```

The existing fallback code (lines 506-542) already handles car extraction from bookings correctly and will become the sole source.

