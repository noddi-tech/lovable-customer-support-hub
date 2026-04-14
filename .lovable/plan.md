

# Fix: Coupon display — show name + value, not full description

## Problem
Currently the coupon label uses `description_public` (long marketing text like "Rabatt på alle bilvaskpakker, velg en av pakkene og få rabatten aktivert!"). The customer app instead shows a short title (e.g., "Rabattkupong - Bilvaskpakker") with just the value ("300 kr").

## Changes

**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`** (lines 904-935)

1. Change label priority: prefer `coupon.name` or `coupon.code` or `coupon.coupon_code` over `description_public` — use the short name, not the marketing description
2. Make the value more prominent — show it as a badge-like element (like the customer app's dashed-border value pills) instead of tiny sub-text
3. Keep the Active/Expired badge
4. Optionally show `description_public` as a tooltip on hover so agents can still access it if needed

The layout per coupon becomes:
```
[Ticket icon] Rabattkupong - Bilvaskpakker    [300 kr]  [Active]
```

Instead of the current long-text layout.

### Files to modify
- `src/components/dashboard/voice/NoddiCustomerDetails.tsx` — reorder label fields, make value prominent, add tooltip for description

