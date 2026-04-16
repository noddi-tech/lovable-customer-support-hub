

# Update for new Noddi API: remove booking tags, add inventory_orders to tire quotes

## Context
The Noddi API is being updated:
1. **Removing `tags`** from booking records — they were always empty lists, not a real concept
2. **Adding `inventory_orders`** to `CustomerLookupTireQuoteRecord` — shows supplier order fulfillment/shipment status

The frontend currently derives tags from service titles (via `TAG_RULES` regex), which still works and is separate from the API "tags" field. The `order_tags` in `ui_meta` are populated by `extractOrderTags()` which does text-matching on booking content — this is our own logic, not dependent on the API's removed field.

## Changes

### 1. Edge Function — pass through `inventory_orders` on tire quotes
**File: `supabase/functions/noddi-customer-lookup/index.ts`**
- In both user group mapping locations (lines ~1411-1413 and ~1655-1657), the tire_quotes are already passed through as `g.tire_quotes || []`. The new `inventory_orders` field will automatically flow through since we spread the tire quote objects. No change needed here unless we're cherry-picking fields — let me verify.

Actually, looking at the code, `tire_quotes: g.tire_quotes || []` passes the entire array from the API, so `inventory_orders` will be included automatically. No edge function changes needed.

### 2. TypeScript types — add `inventory_orders` to tire quote type
**File: `src/hooks/useNoddihKundeData.ts`**
- Add `inventory_orders` to the `tire_quotes` type definition:
```typescript
inventory_orders?: Array<{
  estimated_delivery_date: string;
  order_number: string;
  status: string; // DRAFT | ORDERED_AT_SUPPLIER | IN_TRANSIT | RECEIVED | INVENTORY_IN_STOCK | RETURNED_TO_SUPPLIER
  tracking_number: string;
}>;
```

### 3. Frontend — display inventory orders in tire quote cards
**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`**
- After the existing status_events section (line ~1117), add a new section for inventory orders
- Show each order as a compact row with:
  - Status badge (color-coded: DRAFT=gray, ORDERED=blue, IN_TRANSIT=purple, RECEIVED=green, IN_STOCK=green, RETURNED=red)
  - Order number
  - Estimated delivery date
  - Tracking number (if available)
- Add a label mapping for inventory order statuses:
  - `DRAFT` → "Draft"
  - `ORDERED_AT_SUPPLIER` → "Ordered"
  - `IN_TRANSIT` → "In transit"
  - `RECEIVED` → "Received"
  - `INVENTORY_IN_STOCK` → "In stock"
  - `RETURNED_TO_SUPPLIER` → "Returned"

### 4. No removal of `order_tags` from frontend
The `order_tags` / `extractOrderTags` logic is our own tag derivation from service titles (regex-based), not dependent on the API's removed "tags" field. It still provides value for displaying service type badges. Keep it as-is.

## Files to modify
- `src/hooks/useNoddihKundeData.ts` — add `inventory_orders` type
- `src/components/dashboard/voice/NoddiCustomerDetails.tsx` — render inventory orders in tire quote cards

