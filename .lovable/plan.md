

# Fix Coupon Display — Show Description and Value

## Problem

The coupon mapping in the edge function guesses field names (`coupon_code`, `code`, `name`, `description`, `value`, `discount_value`) but none match the actual Noddi API response. The UI falls back to showing `Coupon #780` (just the id) with no name, description, or value.

The logging code exists but the edge function hasn't been redeployed since it was added, so we have no logs showing the real coupon object shape.

## Approach — Two-step

### Step 1: Deploy edge function with raw passthrough + logging

Change the coupon mapping to pass through ALL raw fields alongside the mapped ones. This way:
- The frontend can `console.log` the raw data immediately
- The edge function logs capture the structure
- We can see exactly what fields exist

In `supabase/functions/noddi-customer-lookup/index.ts` (both mapping locations ~line 1315 and ~1558):

```typescript
coupons: (() => {
  const raw = g.coupons || [];
  if (raw.length > 0) console.log(`Raw coupons for group ${g.id}:`, JSON.stringify(raw.slice(0, 2)));
  return raw.map((c: any) => ({
    ...c,  // pass through ALL raw fields
    // Also add normalized aliases
    id: c.id,
    code: c.coupon_code || c.code || c.name || c.coupon?.code || null,
    description: c.description || c.description_public || c.name || null,
    is_active: c.is_active ?? c.active ?? true,
    value: c.value || c.discount_value || c.amount || c.coupon?.value || null,
    discount_type: c.discount_type || c.type || c.coupon?.discount_type || null,
  }));
})(),
```

By spreading `...c` first, the frontend gets every field the API returns. The normalized aliases override specific keys if they exist.

### Step 2: Add frontend debug logging + improve display

In `src/components/dashboard/voice/NoddiCustomerDetails.tsx`, add a temporary `console.log` of the raw coupon data so we can immediately see the field names in the browser console:

```typescript
console.log('[NoddiCoupons] Raw coupon data:', userGroup?.coupons);
```

Also update the display to try additional common Noddi field patterns:
- `c.description_public` (common Noddi pattern for public-facing text)
- `c.coupon?.code` (nested coupon object)
- `c.coupon?.value` (nested value)

Same changes in `MobileCustomerSummaryCard.tsx`.

### Step 3: After deployment — check logs and refine

Once deployed, trigger a customer lookup for the customer with coupons. Check:
1. Browser console for `[NoddiCoupons]` log
2. Edge function logs for `Raw coupons for group`

Then refine the mapping to use the exact field names.

## Files to change

- `supabase/functions/noddi-customer-lookup/index.ts` — spread raw coupon + add `description_public` alias
- `src/components/dashboard/voice/NoddiCustomerDetails.tsx` — add debug log + try more field names
- `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx` — same

## Technical detail

The key insight is that the Noddi API likely nests coupon details differently than expected. Common patterns in Noddi:
- `description_public` for customer-facing text
- Nested `coupon` object with `code`, `value`, `discount_type`
- `is_active` at the top level

By spreading `...c`, we guarantee no data is lost regardless of the structure.

