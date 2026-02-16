
# Fix: Missing Address/Car/Service in BOOKING_INFO + Missing BOOKING_CONFIRMED Card

## What's Happening

Based on the debug logs, the Noddi API returns booking objects where `car`, `cars`, and `order_lines` fields are all **null/empty**. The address object IS present on the raw booking but was **never mapped** to the output. This means:

- **Address**: Raw `b.address` exists (with `street_name`, `street_number`, etc.) but the booking mapping simply doesn't include an `address` field
- **Car/Vehicle**: `b.car` and `b.cars` are null, so the vehicle IIFE returns null. However, the car data IS successfully extracted into `storedCars` earlier in the same function -- it just isn't linked back to individual bookings
- **Services**: `order_lines`, `items`, `sales_items` are all empty. Services may only be available through a separate field or aren't populated by this endpoint

Additionally, after a successful booking edit, the AI outputs plain text instead of the `[BOOKING_CONFIRMED]` marker, and the `[BOOKING_EDIT]` component shows with redundant explanatory text above it.

## Fixes

### Fix 1: Add `address` field to booking mapping in `executeLookupCustomer`

The mapping at line 994 returns `id, status, scheduledAt, endTime, timeSlot, services, vehicle, car_id, ...` but has NO `address` field. Add it using the same construction logic already used for `storedAddresses`:

```
address: construct from b.address.street_name, street_number, zip_code, city
address_id: b.address?.id
```

### Fix 2: Link car data from `storedCars` map when `b.car`/`b.cars` are null

Since the car data is extracted into `storedCars` (keyed by ID), use the booking's `car_id` or iterate the raw booking's car references to look up the formatted car from the map. Also use `b.address?.id` to look up from `storedAddresses`.

### Fix 3: Add context-based `patchBookingConfirmed` injection

Currently, `patchBookingConfirmed` only fires if the AI outputs the `[BOOKING_CONFIRMED]` marker. Add a context-based trigger (similar to how `patchBookingInfo` works): if an `update_booking` tool result exists in the conversation AND the reply doesn't already contain `[BOOKING_CONFIRMED]`, automatically inject it with data merged from tool results.

### Fix 4: Strip redundant text before `[BOOKING_EDIT]`

The AI outputs "Her er de gamle og nye tidene for bekreftelse: ... Bekrefter du denne endringen?" above the `[BOOKING_EDIT]` component. Add cleanup in the post-processor to strip this text when the marker is present.

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change A** -- Add `address` to booking mapping (after line 999, in the `.map()` block):

```typescript
// Inside the booking .map() at line 994
address: (() => {
  if (!b.address) return null;
  if (typeof b.address === 'string') return b.address;
  const sn = b.address.street_name || '';
  const num = b.address.street_number || '';
  const zip = b.address.zip_code || '';
  const city = b.address.city || '';
  return `${sn} ${num}, ${zip} ${city}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim() || null;
})(),
address_id: b.address?.id || null,
```

**Change B** -- Fix vehicle to use `storedCars` fallback when `b.car`/`b.cars` are null (line 1014-1019):

```typescript
vehicle: (() => {
  // Try direct car fields first
  const c = b.car || (Array.isArray(b.cars) && b.cars[0]) || null;
  if (c) {
    const plate = c.license_plate_number || c.license_plate || '';
    return `${c.make || ''} ${c.model || ''} ${plate ? `(${plate})` : ''}`.trim() || null;
  }
  // Fallback: look up from storedCars using car_id
  const carId = b.car?.id || (Array.isArray(b.cars) && b.cars[0]?.id) || null;
  if (carId && storedCars.has(carId)) {
    const sc = storedCars.get(carId);
    return `${sc.make} ${sc.model} ${sc.license_plate ? `(${sc.license_plate})` : ''}`.trim() || null;
  }
  // Last resort: if there's only one car in storedCars, use it
  if (storedCars.size === 1) {
    const sc = Array.from(storedCars.values())[0];
    return `${sc.make} ${sc.model} ${sc.license_plate ? `(${sc.license_plate})` : ''}`.trim() || null;
  }
  return null;
})(),
```

**Change C** -- Fix `patchBookingInfo` to read new `address` field (line 528-530):

The existing code checks `bookingData.address` -- this will now work since we added the field. But also update the check at line 505 to recognize the `address` field:

```typescript
if (candidate.address && candidate.vehicle) {
  bookingData = candidate;
  break;
}
// Also break if we have the full set from lookup_customer
if (candidate.address && (candidate.vehicle || candidate.license_plate)) {
  bookingData = candidate;
  break;
}
```

And add a fallback for vehicle from `license_plate` field when `vehicle` is null:

```typescript
// After existing vehicle/car/cars checks (line 569)
if (!info.car && bookingData.license_plate) {
  // We have a plate but no car name -- at least show the plate
  info.car = bookingData.license_plate;
}
```

**Change D** -- Add context-based `patchBookingConfirmed` injection (modify function around lines 642-714):

After the existing marker-based logic, add a new block:

```typescript
function patchBookingConfirmed(reply: string, messages: any[]): string {
  // Existing marker-based logic...
  
  // If no [BOOKING_CONFIRMED] marker but update_booking was called, auto-inject
  if (!reply.includes('[BOOKING_CONFIRMED]')) {
    let hasUpdateResult = false;
    const data: any = {};
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== 'tool') continue;
      try {
        const r = JSON.parse(msg.content);
        if (r.booking && (r.booking.id || r.booking.reference)) {
          hasUpdateResult = true;
          // ... merge data from all tool results (same logic as existing)
        }
        if (r.bookings?.[0]) {
          // merge from lookup_customer
        }
      } catch {}
    }
    if (hasUpdateResult && Object.keys(data).length > 0) {
      // Strip the AI's plain text summary and inject the card
      let cleaned = reply;
      cleaned = cleaned.replace(/^.*(?:oppdatert|updated|endret|changed).*$/gim, '');
      cleaned = cleaned.replace(/^.*(?:Bestilling|Booking)\s*(?:ID|nummer).*$/gim, '');
      // ... more cleanup
      return `[BOOKING_CONFIRMED]${JSON.stringify(data)}[/BOOKING_CONFIRMED]\n\n${cleaned.trim()}`;
    }
  }
  return reply;
}
```

**Change E** -- Strip redundant text before `[BOOKING_EDIT]` (in `patchBookingEdit` or as a post-processing step):

```typescript
// Strip explanatory text when BOOKING_EDIT marker is present
if (reply.includes('[BOOKING_EDIT]')) {
  reply = reply.replace(/^.*(?:Gammel tid|Ny tid|gamle og nye|for bekreftelse|Bekrefter du).*$/gim, '');
  reply = reply.replace(/\n{3,}/g, '\n\n').trim();
}
```

### Deploy

Re-deploy `widget-ai-chat` edge function.

## Expected Results

1. **BOOKING_INFO card**: Shows all 5 fields -- address, date, time, car (with reg nr), service
2. **BOOKING_EDIT component**: No redundant text above it, just the diff card with confirm/cancel buttons
3. **BOOKING_CONFIRMED card**: Renders as a green success card (not plain text) with correct address, car, date, time, and service
