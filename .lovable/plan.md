

# Fix: Coupon value not showing for NOK amounts

## Problem
The coupons with `discount.amount` (e.g., 300 NOK) show no value badge, while `discount_percentage` (100%) works. This means the `discount` nested object from the API isn't reaching the frontend properly.

## Root cause
The edge function coupon mapping (lines 1409-1417 and 1655-1663) uses `...c` spread to pass raw fields through, but doesn't explicitly extract `discount.amount` or `discount.currency`. The summary endpoint may nest or omit the `discount` object differently than expected. Meanwhile `discount_percentage` works because it's a top-level field that passes through the spread.

## Fix

### 1. Edge function: explicitly extract discount fields
**File: `supabase/functions/noddi-customer-lookup/index.ts`** (both coupon mapping blocks ~lines 1409-1417 and 1655-1663)

Add explicit extraction of the nested discount object fields:

```typescript
return raw.map((c: any) => ({
  ...c,
  id: c.id,
  name_public: c.name_public || null,
  name_internal: c.name_internal || null,
  discount: c.discount || null,
  discount_percentage: c.discount_percentage ?? null,
  is_active: c.is_active ?? c.active ?? true,
}));
```

Remove the old `code`, `description`, `value`, `discount_type` mappings — they were based on a wrong API shape and are no longer needed. The frontend now uses `name_public`, `discount.amount`, and `discount_percentage` directly.

### 2. Redeploy edge function
Deploy `noddi-customer-lookup`.

### Files to modify
- `supabase/functions/noddi-customer-lookup/index.ts` — simplify coupon mapping in both blocks to explicitly preserve `discount` object and `discount_percentage`

