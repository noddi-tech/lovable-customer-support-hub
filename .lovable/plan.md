
# Fix: Booking Flow — Missing Required API Fields

## Root Cause (from actual Noddi API error logs)

Two **validation errors** from the Noddi API:

1. **`earliest_date`**: `"cars: This field is required"` — the `cars` array is mandatory, the proxy currently treats it as optional
2. **`delivery_windows`**: `"This list may not be empty." attr: "selected_sales_item_ids"` — requires a non-empty list of sales item IDs

The fundamental issue: **ServiceSelectBlock** returns `{type_slug: "dekkskift", service_name: "Dekkskift"}` — it has NO numeric sales item IDs. The AI prompt tells the LLM to extract `selected_sales_item_ids` from the service payload, but that data doesn't exist. So the AI either omits it or makes up a number.

## Solution

### 1. TimeSlotBlock: Auto-fetch `available_items` before querying windows

Since the service selection only provides a slug (not sales item IDs), the TimeSlotBlock must resolve them by calling the existing `available_items` proxy action first.

**Flow inside TimeSlotBlock:**
```text
Step 1: Call available_items(address_id, car_ids) --> get sales item IDs
Step 2: Call earliest_date(address_id, cars) --> get first date  
Step 3: Call delivery_windows(address_id, from_date, to_date, selected_sales_item_ids) --> get slots
```

Changes to `src/widget/components/blocks/TimeSlotBlock.tsx`:
- After mount, call `available_items` with `address_id` and `car_ids` to get the list of available sales items
- Use the returned item IDs as `selected_sales_item_ids` for the delivery windows call
- Always send `cars` (required) in the `earliest_date` call — if empty, show an error instead of making a failing request

### 2. Simplify the TIME_SLOT marker (no more `selected_sales_item_ids`)

Since the component now auto-fetches sales items, the AI only needs to provide `address_id` and `car_ids` in the marker. Remove `selected_sales_item_ids` from the prompt instruction to stop the AI from hallucinating IDs.

Changes to `supabase/functions/widget-ai-chat/index.ts`:
- Update the `time_slot` block prompt to only require `address_id` and `car_ids`
- New format: `[TIME_SLOT]{"address_id": 2860, "car_ids": [555]}[/TIME_SLOT]`

### 3. ServiceSelectBlock: Pass `address_id` for real services

Currently calls `list_services` without `address_id`, always getting fallback data.

Changes to `src/widget/components/blocks/ServiceSelectBlock.tsx`:
- Update `parseContent` to extract `address_id` from the marker content (support both JSON and plain number)
- Accept `address_id` from `data` prop and include it in the `list_services` API call
- Update the `service_select` prompt instruction to include address_id: `[SERVICE_SELECT]{"address_id": 2860}[/SERVICE_SELECT]`

Changes to `supabase/functions/widget-ai-chat/index.ts`:
- Update the `service_select` block prompt to instruct the AI to include address_id

### 4. Proxy: Make `cars` required in earliest_date

Changes to `supabase/functions/noddi-booking-proxy/index.ts`:
- In the `earliest_date` case, always include `cars` in the payload (even if empty array) since the API requires it
- Return a clear error if `cars` is missing

## Files to Change

1. `src/widget/components/blocks/TimeSlotBlock.tsx` — Add `available_items` fetch step; remove dependency on `selected_sales_item_ids` from marker; require `car_ids`
2. `src/widget/components/blocks/ServiceSelectBlock.tsx` — Accept `address_id` from parsed data; pass to API call
3. `supabase/functions/widget-ai-chat/index.ts` — Simplify `time_slot` prompt (remove `selected_sales_item_ids`); update `service_select` prompt (add `address_id`)
4. `supabase/functions/noddi-booking-proxy/index.ts` — Make `cars` always included in `earliest_date` payload

## Deployment

Edge functions `widget-ai-chat` and `noddi-booking-proxy` will need redeployment.
