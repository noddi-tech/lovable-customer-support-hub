

# Fix Coupon Display — Show Name and Value

## Problem

The coupons section shows 4 items with only a ticket icon and "Active" badge — no name, code, or value. The UI template checks for `coupon.code` and `coupon.description`, but the Noddi API likely returns different field names (e.g., `name`, `coupon_code`, `value`, `discount_type`). The edge function passes `g.coupons` through raw without any field mapping.

## Diagnosis approach

We need to first discover the actual coupon object shape from the Noddi API. Two options:

1. **Add logging in the edge function** to dump the raw coupon objects, then check logs
2. **Add a `console.log` in the frontend** to print the coupon data we receive

I recommend option 1 — add a single log line in the edge function, redeploy, and check the logs for this customer. This tells us the exact field names.

## Changes

### 1. `supabase/functions/noddi-customer-lookup/index.ts` — Log + map coupon fields

Add a log line before the coupon mapping to capture the raw structure:

```typescript
console.log(`Coupons for group ${g.id}:`, JSON.stringify(g.coupons?.slice(0, 2)));
```

Then add a proper field mapping (instead of raw passthrough) based on typical Noddi coupon fields:

```typescript
coupons: (g.coupons || []).map((c: any) => ({
  id: c.id,
  code: c.coupon_code || c.code || c.name || null,
  description: c.description || c.name || c.coupon_code || null,
  is_active: c.is_active ?? c.active ?? true,
  value: c.value || c.discount_value || c.amount || null,
  discount_type: c.discount_type || c.type || null,
  valid_from: c.valid_from || null,
  valid_to: c.valid_to || null,
})),
```

This covers the most likely field names. After checking the logs we can refine.

### 2. `src/components/dashboard/voice/NoddiCustomerDetails.tsx` — Show value + fallback name

Update the coupon rendering to:
- Show a fallback name if `code` is missing (use `coupon.description` or `Coupon #id`)
- Display the value/discount when available (e.g., "100 NOK" or "10%")

```
[ticket icon] SUMMER2024        -100 NOK    Active
[ticket icon] Pareto member     -15%        Active
```

### 3. `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx` — Same fix for mobile

Update the mobile coupon display to also show coupon name/code.

## Sequence

1. Deploy edge function with logging → check logs for actual field names
2. Update field mapping in edge function based on real data
3. Update both UI components to display the mapped fields

## Files to change

- `supabase/functions/noddi-customer-lookup/index.ts` — add logging + field mapping
- `src/components/dashboard/voice/NoddiCustomerDetails.tsx` — show coupon name/value
- `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx` — same for mobile

