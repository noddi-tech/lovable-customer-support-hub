

# Fix: Wrong Address in Confirmation + Missing Car/Address in Booking Info Card

## Problems Identified

### Problem 1: BOOKING_INFO card only shows date and time
The `patchBookingInfo` function correctly extracts booking data from the `lookup_customer` tool result. The `lookup_customer` response includes `address` (string) and `vehicle` (string like "Tesla Model Y (EC94156)") at lines 951-953. These fields ARE present in the data. The issue is that `patchBookingInfo` finds the booking data but the code at lines 514-546 correctly handles these. Need to verify whether the tool result scanning is picking up the right result -- it might be finding a different tool result (like `update_booking`) that lacks these fields.

### Problem 2: BOOKING_CONFIRMED shows "Holtet 45" instead of "Slemdalsvingen 65"
After a booking update, `patchBookingConfirmed` scans tool results backwards (most recent first). It finds the `update_booking` response (`{ booking: {...} }`) BEFORE the original `lookup_customer` result. The Noddi PATCH response returns raw booking data where:
- `address` is likely an object (not formatted string), or may be missing entirely
- `car` exists but `vehicle` does not (the Noddi API uses `car`, not `vehicle`)
- So the override at line 650-651 either fails or gets the wrong value, leaving the AI's hallucinated "Holtet 45" in place.

### Problem 3: Car shows "Tesla Model Y" without registration number
Same root cause -- the `patchBookingConfirmed` checks `booking.vehicle` (line 651) but the Noddi API response uses `booking.car`, so the override never fires and the AI's incomplete "Tesla Model Y" stays.

## Fixes

### Fix 1: `patchBookingConfirmed` -- also handle Noddi raw response shapes

The function needs to handle both `lookup_customer` shapes AND raw Noddi API response shapes. Specifically:
- Check `booking.car` (Noddi shape) in addition to `booking.vehicle` (lookup_customer shape)
- Handle `booking.address` as object with `.full_address` or `.address` sub-field
- Continue scanning PAST the `update_booking` result to find `lookup_customer` if the update result lacks address/vehicle data
- Also add `booking.license_plate` or `booking.car.license_plate` to the car display

### Fix 2: `patchBookingConfirmed` -- do a fresh lookup if data is incomplete

After extracting from tool results, if `address` or `car` is still the AI-hallucinated value, do a fresh `lookup_customer` call (like `patchBookingSummary` already does) to get the real current data.

### Fix 3: `patchBookingInfo` -- ensure address, vehicle, and service are always included

Add fallback: if the first matching tool result lacks address/vehicle, continue scanning older tool results. The `lookup_customer` result always has these fields.

---

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change A** -- Fix `patchBookingConfirmed` (lines 620-664):

Rewrite the tool result scanning to:
1. Scan ALL tool results (don't `break` on first match)
2. Merge data from multiple results -- `update_booking` for ID/reference, `lookup_customer` for address/vehicle/service
3. Handle Noddi raw `car` field: `booking.car.make + booking.car.model + (booking.car.license_plate)`
4. Handle Noddi raw `address` object: `booking.address?.full_address || booking.address?.address`
5. If address/car still missing after scanning, do a fresh `executeLookupCustomer` call

```typescript
function patchBookingConfirmed(reply, messages) {
  // ... parse marker as before ...
  
  // Scan ALL tool results, merging data (don't break on first match)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'tool') continue;
    try {
      const toolResult = JSON.parse(msg.content);
      
      // From create_booking / update_booking result
      if (toolResult.booking) {
        const b = toolResult.booking;
        if (!data.booking_id && b.id) data.booking_id = b.id;
        if (!data.booking_number && b.reference) data.booking_number = b.reference;
        // Noddi raw shape: address as object
        if (!data.address && b.address) {
          data.address = typeof b.address === 'string' ? b.address 
            : (b.address.full_address || b.address.address || null);
        }
        // Noddi raw shape: car (not vehicle)
        if (!data.car && b.car) {
          const plate = b.car.license_plate_number || b.car.license_plate || '';
          data.car = `${b.car.make || ''} ${b.car.model || ''} ${plate ? `(${plate})` : ''}`.trim();
        }
      }
      
      // From lookup_customer result
      const booking = toolResult.bookings?.[0];
      if (booking) {
        if (!data.booking_id && booking.id) data.booking_id = booking.id;
        if (!data.booking_number && booking.reference) data.booking_number = booking.reference;
        if (!data.address && booking.address) {
          data.address = typeof booking.address === 'string' ? booking.address 
            : (booking.address.full_address || '');
        }
        if (!data.car && booking.vehicle) data.car = booking.vehicle;
        if (!data.date && booking.scheduledAt) data.date = (booking.scheduledAt.split(',')[0] || '').trim();
        if (!data.time && booking.timeSlot) data.time = booking.timeSlot;
        if (!data.service && booking.services?.[0]) {
          data.service = typeof booking.services[0] === 'string' ? booking.services[0] : booking.services[0].name;
        }
      }
    } catch {}
    // DON'T break -- keep scanning to merge from multiple sources
  }
}
```

**Change B** -- Fix `patchBookingInfo` to scan past incomplete results (lines 491-503):

Instead of breaking on the first tool result with booking data, check if the result has address/vehicle. If not, keep scanning for a richer result (the `lookup_customer` one).

```typescript
let bookingData: any = null;
for (let i = messages.length - 1; i >= 0; i--) {
  const msg = messages[i];
  if (msg.role === 'tool' && typeof msg.content === 'string') {
    try {
      const toolResult = JSON.parse(msg.content);
      let candidate = null;
      if (toolResult.booking) candidate = toolResult.booking;
      else if (toolResult.bookings?.[0]) candidate = toolResult.bookings[0];
      else if (toolResult.id && toolResult.scheduledAt) candidate = toolResult;
      
      if (candidate) {
        // Prefer results that have address + vehicle (lookup_customer shape)
        // over results that only have id (update_booking shape)
        if (!bookingData) bookingData = candidate;
        // If this candidate has more fields, use it instead
        if (candidate.address && candidate.vehicle) {
          bookingData = candidate;
          break; // Found the richest result
        }
      }
    } catch {}
  }
}
```

Also add handling for Noddi raw `car` object in the vehicle section (around line 545-550):
```typescript
if (bookingData.vehicle) {
  info.car = typeof bookingData.vehicle === 'string' ? bookingData.vehicle : ...;
} else if (bookingData.car) {
  // Noddi raw shape
  const c = typeof bookingData.car === 'object' ? bookingData.car : null;
  if (c) {
    const plate = c.license_plate_number || c.license_plate || '';
    info.car = `${c.make || ''} ${c.model || ''} ${plate ? `(${plate})` : ''}`.trim();
  }
} else if (bookingData.cars?.[0]) { ... }
```

And add handling for Noddi raw address object:
```typescript
if (bookingData.address) {
  info.address = typeof bookingData.address === 'string' ? bookingData.address 
    : (bookingData.address.full_address || bookingData.address.address || '');
}
```

### Deploy

Re-deploy `widget-ai-chat` edge function.

## Expected Result

1. **BOOKING_INFO card** (after verification): Shows all fields -- date, time, address ("Slemdalsvingen 65, 0374 Oslo"), car ("Tesla Model Y (EC94156)"), and service ("Dekkskift")
2. **BOOKING_CONFIRMED card** (after edit): Shows correct address ("Slemdalsvingen 65") and car with registration number ("Tesla Model Y (EC94156)")
3. Both post-processors merge data from multiple tool results, using the richest source available
