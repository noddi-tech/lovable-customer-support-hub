

# Fix: Delivery Windows 502 — Missing `selected_sales_item_ids`

## Root Cause

The AI emits the `[TIME_SLOT]` marker with empty `car_ids: []`, `license_plate: ""`, and `sales_item_id: 0`. The `TimeSlotBlock` component only attempts to resolve sales item IDs when car info is present (line 59), so it skips the resolution entirely. The Noddi API then rejects the `delivery_windows` request with a 400 error because `selected_sales_item_ids` is required and must not be empty.

## Fix (1 file)

**File: `src/widget/components/blocks/TimeSlotBlock.tsx`** (lines 58-76)

Remove the guard that requires car info before calling `available_items`. The component should **always** attempt to resolve sales item IDs when none are provided, even if it only has an `address_id`. The `available_items` endpoint accepts `address_id` alone.

```typescript
// Current (line 59):
if (salesItemIds.length === 0 && (licensePlate || carIds.length > 0)) {

// Updated:
if (salesItemIds.length === 0) {
```

The rest of the `available_items` payload construction (lines 60-68) already handles missing car info gracefully — it only adds `license_plates` or `car_ids` if present.

Additionally, add a final guard: if `salesItemIds` is still empty after the resolution attempt, show a user-friendly error instead of making a doomed API call:

```typescript
// After the available_items call (after line 76):
if (salesItemIds.length === 0) {
  setError('Kunne ikke finne tjenester for denne adressen. Prøv igjen.');
  setLoading(false);
  return;
}
```

## Scope

| File | Change |
|------|--------|
| `src/widget/components/blocks/TimeSlotBlock.tsx` | Remove car-info guard on `available_items` call; add fallback error if no items resolved |

No edge function changes needed — the proxy already handles empty `selected_sales_item_ids` correctly by omitting it from the request.

