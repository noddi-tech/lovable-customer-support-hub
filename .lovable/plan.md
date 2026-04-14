

# Fix: Use `name_public` and `discount.amount`/`currency` for coupon display

## Problem
The coupon fields currently used (`name`, `code`, `value`, `discount_type`) don't match the actual API response. The real API returns `name_public`, `discount.amount`, `discount.currency`, and `discount_percentage`.

## Changes

**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`** (lines 906-910)

Update the field mapping to match the actual API structure:

```typescript
// Label: use name_public (what app shows), fall back to name_internal, then generic
const label = coupon.name_public || coupon.name_internal || coupon.name || `Coupon #${coupon.id || idx + 1}`;

// Value: use discount.amount + discount.currency, or discount_percentage
const valueText = coupon.discount?.amount != null
  ? `${coupon.discount.amount} ${coupon.discount.currency || 'kr'}`
  : coupon.discount_percentage != null
    ? `${coupon.discount_percentage}%`
    : null;
```

Remove the old `val`/`discType` intermediaries (lines 908-910) and replace with the above. Everything else (layout, badges, tooltip) stays the same.

### Files to modify
- `src/components/dashboard/voice/NoddiCustomerDetails.tsx` — fix field mapping on lines 906-910

