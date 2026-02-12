
# Fix: Service Selection Parsing + Time Slot Fallback + Stored Customer Data

## Problem 1: "No services available for this location"

The Noddi `available_items` API returns this shape:
```json
{"cars": [{"make": "Tesla", "model": "Model y", "sales_items": [...]}]}
```

But ServiceSelectBlock (line 64) parses it as:
```js
const raw = Array.isArray(respData) ? respData : respData.results || [];
```

This never finds `respData.cars`, so `raw` is always empty. Additionally:
- Item ID is `sales_item_id` (not `id`)
- Price is `gross_price.amount` (not `unit_price` or `price`)

## Problem 2: TimeSlotBlock has the same parsing bug

Line 53 in TimeSlotBlock uses `itemsData.results || []` -- same wrong shape assumption.

## Problem 3: No stored addresses/cars after phone verification

The `executeLookupCustomer` function in `widget-ai-chat` fetches bookings but never fetches the customer's registered addresses or cars from the Noddi API. These need to be extracted from the user groups or bookings data and included in the lookup response so the AI can offer them as options.

---

## Solution

### File 1: `src/widget/components/blocks/ServiceSelectBlock.tsx`

Fix the response parsing to match the actual API shape:

```typescript
// BEFORE (line 64-79):
const raw = Array.isArray(respData) ? respData : respData.results || [];
for (const category of raw) { ... }

// AFTER:
// Extract sales_items from the cars array
const cars = respData.cars || [];
const salesItems: SalesItem[] = [];
for (const car of cars) {
  for (const item of (car.sales_items || [])) {
    salesItems.push({
      id: item.sales_item_id,           // was: item.id
      name: item.name || '',
      short_description: item.short_description || '',
      price: item.gross_price?.amount,   // was: item.unit_price || item.price
      category_type: item.booking_category_type || '',
      category_name: CATEGORY_LABELS[item.booking_category_type] || item.booking_category_type || '',
    });
  }
}
```

Add a `CATEGORY_LABELS` map to show proper category headings like "Dekktjenester" and "Reparasjon av steinsprutskader".

Sort items by `ui_sort_order` from the API response.

### File 2: `src/widget/components/blocks/TimeSlotBlock.tsx`

Fix the same parsing bug in the fallback `available_items` call (lines 53-58):

```typescript
// BEFORE:
const raw = Array.isArray(itemsData) ? itemsData : itemsData.results || [];
for (const cat of raw) {
  for (const item of (cat.sales_items || [])) {
    if (item.id) salesItemIds.push(Number(item.id));
  }
}

// AFTER:
const cars = itemsData.cars || [];
for (const car of cars) {
  for (const item of (car.sales_items || [])) {
    if (item.sales_item_id) salesItemIds.push(Number(item.sales_item_id));
  }
}
```

### File 3: `supabase/functions/widget-ai-chat/index.ts`

In `executeLookupCustomer`, extract stored addresses and cars from the customer's booking history and include them in the response:

```typescript
// After fetching bookings, extract unique addresses and cars
const storedAddresses = new Map();
const storedCars = new Map();

for (const b of bookings) {
  if (b.address?.id) {
    storedAddresses.set(b.address.id, {
      id: b.address.id,
      full_address: b.address.full_address || '',
      street: b.address.street_name || '',
      city: b.address.city || '',
    });
  }
  if (b.car?.id) {
    storedCars.set(b.car.id, {
      id: b.car.id,
      make: b.car.make || '',
      model: b.car.model || '',
      license_plate: b.car.license_plate || '',
    });
  }
}

// Include in the response
return JSON.stringify({
  found: true,
  customer: { ... },
  bookings: [...],
  stored_addresses: Array.from(storedAddresses.values()),
  stored_cars: Array.from(storedCars.values()),
});
```

This allows the AI to present stored addresses and cars as quick-select options when starting a booking flow, saying something like "I see you have these saved addresses: ... Would you like to use one of these?"

## Deployment

- `widget-ai-chat` edge function needs redeployment
- Frontend changes (ServiceSelectBlock, TimeSlotBlock) deploy automatically

## Expected Result After Fix

1. ServiceSelectBlock shows grouped sales items with correct names and prices:
   - Dekktjenester: Dekkhotell ink. hjemlevert dekkskift (1 999 kr), Dekkskift (699 kr), Dekkhotell kun lagring (1 799 kr)
   - Reparasjon: Steinsprutfiks (Gratis)
2. TimeSlotBlock correctly resolves sales_item_ids when needed
3. After phone verification, the AI mentions the customer's stored addresses and cars
