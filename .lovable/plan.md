

# Fix: Delivery Windows 404 — Sending Too Many Sales Item Categories

## Problem

The `TimeSlotBlock` fetches ALL available sales items for a car/address and sends every single `sales_item_id` to the `delivery_windows` endpoint. The Noddi API returns a 404 because no single service department covers all categories (e.g., "Wheel change" + "Wheel storage" + "Windscreen repair") for the given address.

The error from Noddi:
```
Service department not found for address ... and service categories: Windscreen repair, Wheel change, Wheel storage
```

## Root Cause

Lines 95-99 of `TimeSlotBlock.tsx` collect every item from every category:
```typescript
for (const car of cars) {
  for (const item of (car.sales_items || [])) {
    if (item.sales_item_id) salesItemIds.push(Number(item.sales_item_id));
  }
}
```

This sends mutually exclusive items (e.g., "Dekkskift" and "Dekkhotell") AND cross-category items (wheel services + stone chip repair) all at once.

## Fix (1 file)

**File: `src/widget/components/blocks/TimeSlotBlock.tsx`**

1. **Recover the selected service from localStorage**: The `ServiceSelectBlock` stores `{ sales_item_id, service_name, price }` in `noddi_action_` keys. Scan for this to find which specific item the user chose.

2. **If a specific item is found, use only that one**: Instead of sending all items, send just the user's selection.

3. **If no specific selection found, filter to one category**: Group items by `booking_category_type` and pick only the first category (typically wheel_services), avoiding cross-category conflicts.

```typescript
// After fetching available items (line 93-99), replace the collect-all loop:

// 1. Try to recover selected service from localStorage
let selectedItemId: number | null = null;
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (!key?.startsWith('noddi_action_')) continue;
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '');
    if (stored.sales_item_id && allAvailableIds.has(Number(stored.sales_item_id))) {
      selectedItemId = Number(stored.sales_item_id);
      break;
    }
  } catch {}
}

// 2. Use selected item, or fall back to first category only
if (selectedItemId) {
  salesItemIds = [selectedItemId];
} else {
  // Group by category, pick first category only
  const firstCategory = cars[0]?.sales_items?.[0]?.booking_category_type;
  for (const car of cars) {
    for (const item of (car.sales_items || [])) {
      if (item.sales_item_id && item.booking_category_type === firstCategory) {
        salesItemIds.push(Number(item.sales_item_id));
      }
    }
  }
}
```

## Why This Fixes It

- Currently: sends `[60978, 60282, 60442, 61187]` (3 wheel services + 1 stone chip repair) -- Noddi can't find a dept covering all
- After fix: sends `[60282]` (just the user's selected service) or at most items from one category -- Noddi finds the matching dept

## Scope

| File | Change |
|------|--------|
| `src/widget/components/blocks/TimeSlotBlock.tsx` | Recover selected service from localStorage; filter items to one category if no selection found |

No edge function changes needed.
