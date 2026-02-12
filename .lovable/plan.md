

# Fix: Noddi API Format Mismatches at Time Slot Stage

## Problem

The edge function logs show three Noddi API validation errors:

1. **`available_items`** (400): `"license_plates: This field is required"` -- Noddi expects `license_plates: ["EC94156"]`, but we send `car_ids: [13888]`
2. **`earliest_date`** (400): `"cars.0: Expected an object, but received int"` -- Noddi expects `cars: [{id: 13888}]`, but we send `cars: [13888]`
3. **`delivery_windows`** (400): `"selected_sales_item_ids: This list may not be empty"` -- fails because step 1 failed so no item IDs were resolved

## Solution

Two changes: fix the proxy to send the correct data formats, and pass the license plate through the TIME_SLOT marker.

### 1. Proxy: Fix `available_items` to send `license_plates`

**File: `supabase/functions/noddi-booking-proxy/index.ts`**

In the `available_items` case, accept a `license_plates` field from the request and forward it to the Noddi API. The Noddi endpoint requires `license_plates` (not `car_ids`).

```
// Accept license_plates from request body
const { address_id, car_ids, license_plates, sales_item_category_id } = body;
const payload = { address_id };
// Prefer license_plates; fall back to car_ids for backward compat
if (license_plates) payload.license_plates = license_plates;
else if (car_ids) payload.car_ids = car_ids;
```

### 2. Proxy: Fix `earliest_date` to wrap car IDs as objects

**File: `supabase/functions/noddi-booking-proxy/index.ts`**

In the `earliest_date` case, transform plain integer car IDs into the object format Noddi expects:

```
// Transform [13888] into [{id: 13888}]
const carsForApi = cars.map(c => typeof c === 'number' ? { id: c } : c);
const edPayload = { address_id, cars: carsForApi };
```

### 3. TimeSlotBlock: Pass `license_plate` to `available_items`

**File: `src/widget/components/blocks/TimeSlotBlock.tsx`**

- Extract `license_plate` from `data` (parsed from marker)
- Send `license_plates: [licensePlate]` in the `available_items` API call
- Update `parseContent` to also extract `license_plate`

### 4. AI Prompt: Include `license_plate` in TIME_SLOT marker

**File: `supabase/functions/widget-ai-chat/index.ts`**

Update the TIME_SLOT instruction to tell the AI to also include the license plate:

```
[TIME_SLOT]{"address_id": 2860, "car_ids": [555], "license_plate": "EC94156"}[/TIME_SLOT]
```

The AI already has the license plate in conversation history (from the LicensePlateBlock hidden message), so it just needs to include it.

## Files to Change

1. `supabase/functions/noddi-booking-proxy/index.ts` -- Fix `available_items` (accept `license_plates`) and `earliest_date` (wrap IDs as objects)
2. `src/widget/components/blocks/TimeSlotBlock.tsx` -- Extract and send `license_plate`; update `parseContent`
3. `supabase/functions/widget-ai-chat/index.ts` -- Update TIME_SLOT prompt to include `license_plate`

## Deployment

Edge functions `noddi-booking-proxy` and `widget-ai-chat` need redeployment.
