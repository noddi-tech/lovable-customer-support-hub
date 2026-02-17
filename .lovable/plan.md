
# Fix Booking Card Layout + Add Diagnostic Logging

## Part 1: Fix BookingCard header and add service as a detail row

**File**: `src/widget/components/blocks/BookingSelectBlock.tsx`

Currently the header shows `{b.service || 'Bestilling'} #${b.id}` -- mixing service name into the title. Instead:

- **Header**: Always show `Bestilling #${b.id}` (consistent with BookingConfirmedBlock)
- **Body**: Add service as a row `🛠️ Tjeneste` before the other details

Changes to `BookingCard`:
- Line 60-61: Change header text from `{b.service || 'Bestilling'}{b.id ? ' #' + b.id : ''}` to `Bestilling{b.id ? ' #' + b.id : ''}`
- Line 22: Add service row at the top of the rows array: `if (b.service) rows.unshift({ label: '🛠️ Tjeneste', value: b.service })`

## Part 2: Add diagnostic logging for vehicle/service data from API

**File**: `supabase/functions/widget-ai-chat/index.ts`

Add two diagnostic logs:

1. After the `bookings-for-customer` fetch (after line 1307), log a sample booking's keys and car-related fields:
```typescript
if (results.length > 0) {
  console.log('[lookup] Sample booking keys:', Object.keys(results[0]));
  console.log('[lookup] Sample booking car fields:', JSON.stringify({
    car: results[0].car,
    cars: results[0].cars,
    booking_items_car: results[0].booking_items_car,
    booking_items: results[0].booking_items,
  }));
}
```

2. After the booking mapping (after line 1515), log what was extracted:
```typescript
console.log('[lookup] Mapped sample:', JSON.stringify(
  mappedBookings?.slice(0, 2).map((b: any) => ({
    id: b.id, vehicle: b.vehicle, license_plate: b.license_plate, services: b.services
  }))
));
```

## Part 3: Add `booking_items` as vehicle extraction fallback

**File**: `supabase/functions/widget-ai-chat/index.ts`

After the `booking_items_car` check (line 1497), add a fallback for `booking_items`:
```typescript
if (Array.isArray(b.booking_items) && b.booking_items[0]?.car) {
  const bic = b.booking_items[0].car;
  const plate = extractPlateString(bic.license_plate_number || bic.license_plate || bic.registration);
  return `${bic.make || ''} ${bic.model || ''} ${plate ? '(' + plate + ')' : ''}`.trim() || null;
}
```

Also add `booking_items` to the stored cars loop (after line 1369):
```typescript
if (Array.isArray(b.booking_items)) {
  for (const bi of b.booking_items) {
    const car = bi.car;
    if (car?.id && !storedCars.has(car.id)) {
      storedCars.set(car.id, {
        id: car.id,
        make: car.make || '',
        model: car.model || '',
        license_plate: extractPlateString(car.license_plate_number || car.license_plate || car.registration),
      });
    }
  }
}
```

## Summary

| File | Change |
|------|--------|
| `BookingSelectBlock.tsx` | Header always says "Bestilling #ID", service moved to detail row |
| `widget-ai-chat/index.ts` | Diagnostic logs for raw API response shape |
| `widget-ai-chat/index.ts` | `booking_items` fallback for vehicle extraction + stored cars |

After deploying, trigger a booking lookup to check the logs and confirm what fields the API actually returns.
