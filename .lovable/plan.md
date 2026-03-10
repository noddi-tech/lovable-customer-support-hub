

## Fix Plan: Two Bugs in Booking Flow

### Bug 1: Wrong cars extracted from booking history

**Root cause**: In `executeLookupCustomer` (widget-ai-chat, line 1533-1544), the code does `const car = bic.car` for `booking_items_car` entries. But the Noddi API returns `booking_items_car` items where the car data IS the item itself — there's no nested `.car` property. The actual structure from logs:

```json
{"booking_items_car": [{"id": 13725, "make": "Tesla", "model": "Model y", "license_plate": {"country_code": "NO", "number": "EC94156"}}]}
```

So `bic.car` is `undefined`, causing real cars to be skipped. The AI then likely fabricates dummy cars (like "Audi Q5 AB12345") or gets them from stale data.

**Fix**: In `widget-ai-chat/index.ts` lines 1533-1544, change `const car = bic.car` to treat `bic` itself as the car object (with fallback to `bic.car` for compatibility):

```typescript
for (const bic of b.booking_items_car) {
  const car = bic.car || bic;  // bic IS the car in Noddi's structure
  if (car?.id && !storedCars.has(car.id)) {
    storedCars.set(car.id, {
      id: car.id,
      make: car.make || car.brand || '',
      model: car.model || '',
      license_plate: extractPlateString(car.license_plate_number || car.license_plate || car.registration),
    });
  }
}
```

Same fix for the `booking_items` loop (line 1548): `const car = bi.car || bi;`

### Bug 2: `brand` → `brand_domain` in available_items

**Root cause**: The error is explicit: `"'brand' is an invalid field. Did you mean 'brand_domain'?"`. The Noddi API changed the field name.

**Fix**: In `noddi-booking-proxy/index.ts` line 94, change:
```typescript
const payload: any = { address_id: aiAddr, brand: brand || "noddi" };
```
to:
```typescript
const payload: any = { address_id: aiAddr, brand_domain: brand || "noddi" };
```

### Files changed

| File | Change |
|---|---|
| `supabase/functions/widget-ai-chat/index.ts` | Fix car extraction from `booking_items_car` (use `bic` directly, not `bic.car`) |
| `supabase/functions/noddi-booking-proxy/index.ts` | Rename `brand` → `brand_domain` in available_items payload |

