

# Fix: Time Slot API Failures + Service Selection Improvements

## Problems Found (via live API testing)

### Problem 1: `available_items` sends wrong license_plate format
The proxy sends `license_plates: ["EC94156"]` (array of strings), but Noddi requires `license_plates: [{"number": "EC94156", "country_code": "NO"}]` (array of objects). Confirmed by testing -- sending objects returns 200 with sales items.

### Problem 2: `earliest_date` requires license_plate + selected_sales_items per car
Noddi requires `cars: [{license_plate: {number, country_code}, selected_sales_items: [60282]}]`. Even with correct format it returns 500, so we should skip this call and use tomorrow's date as the start.

### Problem 3: `delivery_windows` returns nested object, not array
The API returns `{"2026-02-13": {"06:00 - 11:00": {delivery_window_id, starts_at, ends_at, ...}}}` but TimeSlotBlock expects a flat array. The parsing code never finds any windows.

### Problem 4: Service selection shows categories, not actual items
Currently shows "Dekkskift" and "Steinsprut-reparasjon" (category labels). Should show the actual sales items with names and prices:
- Dekkhotell ink. hjemlevert dekkskift (1 999 kr)
- Dekkskift (699 kr)
- Dekkhotell kun lagring (1 799 kr)
- Steinsprutfiks (0 kr)

This also means the selected `sales_item_id` (e.g., 60282) is passed forward correctly to delivery_windows.

## Solution

### File 1: `supabase/functions/noddi-booking-proxy/index.ts`

**`available_items` handler**: Transform `license_plates` from strings to Noddi's expected object format:
```
// ["EC94156"] -> [{"number": "EC94156", "country_code": "NO"}]
if (license_plates) {
  payload.license_plates = license_plates.map(lp =>
    typeof lp === 'string' ? { number: lp, country_code: country_code || 'NO' } : lp
  );
}
```

**New `available_sales_items` action**: Add a dedicated action that calls `available_items` and returns a flattened, normalized list of sales items (with id, name, price, category) for the ServiceSelectBlock to use instead of `list_services`.

**`delivery_windows` handler**: No changes needed -- it works correctly when called with proper `selected_sales_item_ids`.

### File 2: `src/widget/components/blocks/ServiceSelectBlock.tsx`

Rework to show actual sales items instead of categories:
- After address + license plate are known, call `available_items` (with license_plates as objects) to get the actual sales items
- Display items grouped by `booking_category_type` with name, short_description, and price
- On selection, return `{sales_item_id: 60282, service_name: "Dekkskift", price: 699}` instead of `{type_slug: "wheel_services"}`

This requires passing `license_plate` into the SERVICE_SELECT marker too, so the block can call `available_items`.

### File 3: `src/widget/components/blocks/TimeSlotBlock.tsx`

**Fix delivery_windows response parsing**: The response is a nested object `{date: {label: window}}`, not an array. Flatten it:
```
// Convert {date: {label: {starts_at, ends_at, delivery_window_id}}} to flat array
const allWindows = [];
for (const [date, slots] of Object.entries(wData)) {
  for (const [label, w] of Object.entries(slots)) {
    allWindows.push({ ...w, date });
  }
}
```

**Skip `earliest_date` call**: Use tomorrow's date since the Noddi `earliest_date` endpoint returns 500. The delivery_windows response naturally shows what's available.

**Skip `available_items` call**: Since ServiceSelectBlock now provides the `sales_item_id`, pass it directly to `delivery_windows` instead of re-fetching.

**Filter out closed/full windows**: Only show windows where `is_closed === false` and `is_capacity_full === false`.

### File 4: `supabase/functions/widget-ai-chat/index.ts`

Update system prompt:
- SERVICE_SELECT marker now needs `address_id` AND `license_plate`:
  `[SERVICE_SELECT]{"address_id": 2860, "license_plate": "EC94156"}[/SERVICE_SELECT]`
- TIME_SLOT marker now needs `sales_item_id` from the service selection step:
  `[TIME_SLOT]{"address_id": 2860, "car_ids": [13888], "license_plate": "EC94156", "sales_item_id": 60282}[/TIME_SLOT]`

### Stored addresses and cars (separate follow-up)
Serving stored addresses and cars on login is a larger feature that requires:
- Calling the Noddi customer lookup API after phone verification
- Extracting stored addresses and cars from the user profile
- Displaying them as selectable options in the address and license plate blocks
This will be handled as a separate task after the current fixes.

## Deployment
Edge functions `noddi-booking-proxy` and `widget-ai-chat` need redeployment.

## Summary of data flow after fix

```text
1. User selects address -> address_id = 2860
2. User enters license plate -> car_id = 13888, license_plate = "EC94156"
3. SERVICE_SELECT calls available_items with license_plates: [{number: "EC94156", country_code: "NO"}]
   -> Returns sales items: Dekkskift (60282), Dekkhotell (60442), etc.
4. User selects "Dekkskift" -> sales_item_id = 60282
5. TIME_SLOT calls delivery_windows with selected_sales_item_ids: [60282]
   -> Returns nested date/window object, flattened and filtered
6. User picks a time slot -> booking proceeds
```
