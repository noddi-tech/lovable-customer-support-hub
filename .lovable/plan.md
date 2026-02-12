

# Fix Plan: 5 Booking Flow Issues

## Issue 1: Booking creation returns 502 validation error

**Problem**: The Noddi API at `POST /v1/bookings/` requires these fields that we're not sending:
- `user` (user ID)
- `user_group` (user group ID)
- `delivery_window` must be an object (not an integer)
- `cars[].license_plate` (object with `country_code` and `number`)
- `cars[].selected_sales_item_ids` (not `sales_items` with nested objects)

Currently `noddi-booking-proxy` builds the payload using `car_id` and `sales_items: [{id}]` format, which is wrong.

**Fix - Two files:**

### A. `supabase/functions/noddi-booking-proxy/index.ts` (create_booking case, ~lines 205-236)

Rewrite the payload construction to match the correct Noddi API format:

```typescript
case "create_booking": {
  const { action: _a, address_id, user_id, user_group_id, 
          license_plate, country_code, sales_item_ids, 
          delivery_window_id, ...rest } = body;

  const cartPayload: any = {
    ...rest,
    address: address_id,
    user: user_id,
    user_group: user_group_id,
    delivery_window: delivery_window_id,
    cars: [
      {
        license_plate: {
          country_code: country_code || 'NO',
          number: license_plate,
        },
        selected_sales_item_ids: sales_item_ids || [],
      },
    ],
  };
  // ... rest of fetch logic
}
```

### B. `src/widget/components/blocks/BookingSummaryBlock.tsx` (~lines 20-27)

Update `handleConfirm` to pass the new fields from `data`:

```typescript
const bookingPayload: any = { action: 'create_booking' };
if (data.address_id) bookingPayload.address_id = data.address_id;
if (data.user_id) bookingPayload.user_id = data.user_id;
if (data.user_group_id) bookingPayload.user_group_id = data.user_group_id;
if (data.license_plate) bookingPayload.license_plate = data.license_plate;
if (data.country_code) bookingPayload.country_code = data.country_code;
if (data.sales_item_ids) bookingPayload.sales_item_ids = data.sales_item_ids;
if (data.delivery_window_id) bookingPayload.delivery_window_id = data.delivery_window_id;
```

### C. `supabase/functions/widget-ai-chat/index.ts` (~line 1008-1009)

Update the BOOKING_SUMMARY marker docs to require `user_id`, `user_group_id`, `license_plate`, and `country_code`:

```
12. BOOKING SUMMARY - Include ALL booking data as JSON. You MUST include user_id and user_group_id from the lookup_customer result:
[BOOKING_SUMMARY]{"address":"Holtet 45","address_id":2860,"car":"Tesla Model 3","license_plate":"EC94156","country_code":"NO","user_id":12345,"user_group_id":6789,"service":"Dekkskift","sales_item_ids":[60282],"date":"Mon 12 Feb","time":"08:00-12:00","price":"599 kr","delivery_window_id":123}[/BOOKING_SUMMARY]
```

---

## Issue 2: AI still writes addresses as text before showing the interactive component

**Problem**: Despite previous prompt fixes, the AI still outputs text like "Her er adressene dine:" followed by a bullet list, THEN the ADDRESS_SEARCH component (visible in screenshots).

**Fix**: `supabase/functions/widget-ai-chat/index.ts`

Strengthen the ADDRESS_SEARCH instruction (~line 988-992) to be even more explicit:

```
8. ADDRESS SEARCH - render an interactive address picker:
Output ONLY this marker and NOTHING else in the message. No text before it, no text after it, no list of addresses.
WRONG: "Her er adressene dine: ..." then [ADDRESS_SEARCH]
CORRECT: [ADDRESS_SEARCH]{"stored": [...]}[/ADDRESS_SEARCH]
The marker is the ENTIRE message content. The component shows stored addresses as clickable pills AND a search field.
```

Also update the hardcoded fallback flow instruction (~line 942) and the dynamic flow field instruction (~line 560-564) to reinforce: "Your ENTIRE response must be ONLY the marker, nothing else."

---

## Issue 3: Only one car fetched

**Problem**: The `executeLookupCustomer` function extracts cars from bookings using a Map keyed by `b.car.id` (~line 360-367). This should already deduplicate across bookings. However, some bookings may share the same car object, and others may have cars stored differently (e.g., `b.cars` array instead of `b.car`).

**Fix**: `supabase/functions/widget-ai-chat/index.ts` (~lines 345-368)

Expand car extraction to also check `b.cars` (plural) array, which some Noddi booking responses use:

```typescript
for (const b of bookings) {
  // Handle b.address (existing logic, unchanged)
  
  // Handle single car
  if (b.car?.id) {
    storedCars.set(b.car.id, {
      id: b.car.id,
      make: b.car.make || '',
      model: b.car.model || '',
      license_plate: b.car.license_plate_number || b.car.license_plate || '',
    });
  }
  // Handle cars array (some bookings use plural)
  if (Array.isArray(b.cars)) {
    for (const car of b.cars) {
      if (car?.id) {
        storedCars.set(car.id, {
          id: car.id,
          make: car.make || '',
          model: car.model || '',
          license_plate: car.license_plate_number || car.license_plate || '',
        });
      }
    }
  }
}
```

---

## Issue 4: Cannot select a different date in TimeSlotBlock

**Problem**: The `TimeSlotBlock` component (`src/widget/components/blocks/TimeSlotBlock.tsx`) fetches 14 days of delivery windows but only displays the first date's slots (~lines 113-115). There's no way to navigate to other dates.

**Fix**: `src/widget/components/blocks/TimeSlotBlock.tsx`

Add date navigation:

1. Store ALL dates with their windows in state (not just the first date).
2. Add a `selectedDateIndex` state.
3. Render left/right arrow buttons to navigate between available dates.
4. Update the `handleSlotSelect` to use the currently selected date.

```text
UI Layout:
  < Fri 13 Feb >     (arrows to navigate dates)
  [06:00-11:00] [06:00-16:00]
  [08:00-11:00] [08:00-14:00]
  ...
```

Key state changes:
- `allDates: Record<string, any[]>` - all dates with their windows
- `sortedDates: string[]` - sorted date keys
- `selectedIdx: number` - currently selected date index
- Navigation arrows disabled at boundaries

---

## Issue 5: Remove the redundant "Confirm this looks correct" step

**Problem**: After selecting a time slot, the AI shows a text summary asking "Confirm this looks correct?" before showing the BOOKING_SUMMARY card. This is redundant since BOOKING_SUMMARY already shows all details with Confirm/Cancel buttons.

**Fix**: `supabase/functions/widget-ai-chat/index.ts`

Add a rule in the BOOKING_SUMMARY marker docs (~line 1008) and in the RULES section:

```
- After the customer selects a time slot, go DIRECTLY to [BOOKING_SUMMARY] with all collected data. Do NOT show a separate text confirmation step asking "does this look correct" before the summary card. The BOOKING_SUMMARY card IS the confirmation step.
```

---

## Deployment

- Redeploy `widget-ai-chat` edge function
- Redeploy `noddi-booking-proxy` edge function
- Frontend changes (TimeSlotBlock, BookingSummaryBlock) auto-deploy

