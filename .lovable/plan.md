

# Remove duplicate Service Tags sections below booking card

## Problem
Service tags are shown in three places:
1. **Inside the booking card** (line 573) — correct, keep this
2. **Inside the "most recent booking" collapsible** (line 841) — redundant, remove
3. **Bottom of the component** (line 1100) — redundant, remove

The user only wants service tags displayed on the booking card itself, not repeated below it.

## Changes

**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`**

1. **Remove lines 841-858** — the service tags block inside `mostRecentBooking` section
2. **Remove lines 1100-1117** — the standalone "Service Tags" section at the bottom

No other files affected. The booking card (line 573) already has the correct service tags with the `deriveTagsFromTitle` fallback.

