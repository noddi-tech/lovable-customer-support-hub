

# Fix: Show All Customer Cars, Not Just Cars From Bookings

## Problem

The `[LICENSE_PLATE]` quick-select pills only show 1 car (EC94156) even though the customer has 6 cars on their Noddi account. This is because cars are currently extracted only from booking history -- any car that hasn't been used in a recent booking won't appear.

## Root Cause

In `supabase/functions/widget-ai-chat/index.ts`, the `executeLookupCustomer` function (lines 473-512) iterates over `bookings` and extracts `b.car` and `b.cars` from each booking. Cars not associated with any booking are missed entirely.

## Solution

Add a dedicated API call to fetch all cars registered under the user group via the Noddi API endpoint `/v1/user-groups/{id}/cars/`. This returns all cars on the account regardless of booking history.

### Changes

**File: `supabase/functions/widget-ai-chat/index.ts`** (inside `executeLookupCustomer`, after fetching bookings ~line 468)

1. Add a new fetch call to `/v1/user-groups/{userGroupId}/cars/` to get all registered cars
2. Populate `storedCars` from this dedicated cars endpoint first (primary source)
3. Keep the existing booking-based car extraction as a fallback (in case the cars endpoint doesn't return license plate info or is unavailable)

```text
Pseudocode:

// After fetching bookings, fetch all cars for the user group
if (userGroupId) {
  const carsResp = await fetch(`${API_BASE}/v1/user-groups/${userGroupId}/cars/`, { headers });
  if (carsResp.ok) {
    const carsData = await carsResp.json();
    const allCars = Array.isArray(carsData) ? carsData : (carsData.results || []);
    for (const car of allCars) {
      if (car?.id) {
        storedCars.set(car.id, {
          id: car.id,
          make: car.make || car.brand || '',
          model: car.model || '',
          license_plate: car.license_plate_number || car.license_plate || '',
        });
      }
    }
  }
}

// Then still run existing booking-based extraction as fallback
```

4. The `license_plate` field in the stored cars output also needs to handle the nested `license_plate: { number, country_code }` format that Noddi sometimes uses.

### Why This Approach

- The `/v1/user-groups/{id}/cars/` endpoint is the canonical source for all cars on an account
- It runs in parallel with or after the bookings fetch, adding minimal latency
- The existing booking-based extraction remains as fallback for edge cases
- No changes needed to the widget-side `LicensePlateBlock` -- it already handles arrays of stored cars

### Files Changed

- `supabase/functions/widget-ai-chat/index.ts` -- add cars API call in `executeLookupCustomer`
- Redeploy `widget-ai-chat` edge function
