

# Fix: License Plate `[object Object]` + Redundant BOOKING_INFO/ACTION_MENU During Edits

## Issues Found

### 1. Car shows "Tesla Model y ([object Object])"
The Noddi API returns `license_plate` as an **object** `{number: "EC94156", country_code: "NO"}`, not a string. Every place in the code that does `c.license_plate_number || c.license_plate` falls through to the object, which renders as `[object Object]`.

This affects **12+ locations** across `executeLookupCustomer`, `patchBookingInfo`, `patchBookingConfirmed`, and `storedCars` extraction.

### 2. BOOKING_INFO card not shown after initial customer lookup (Screenshot 1)
The logs confirm BOOKING_INFO IS being injected into the response. The most likely cause is that the AI outputs a greeting + ACTION_MENU, and `patchBookingInfo` injects BOOKING_INFO before it. But the widget may have a scrolling or rendering issue, or the card is above the viewport. However, there may also be a guard issue where `patchBookingInfo` doesn't fire if the first response doesn't have the tool result in the expected position.

### 3. BOOKING_INFO + ACTION_MENU shown again during active edit flow (Screenshot 3)
After user clicks "Endre tidspunkt", the AI outputs `[TIME_SLOT]`. Then `patchBookingInfo` finds booking data in tool results and injects `[BOOKING_INFO]`. Then `patchActionMenu` sees `[BOOKING_INFO]` and injects `[ACTION_MENU]`. This creates a cluttered UI with irrelevant components during an active edit flow.

---

## Fixes

### Fix A: Add `extractPlateString` helper for license plate objects
A single helper function that safely extracts a plate string regardless of whether the value is a string, object `{number, country_code}`, or null:

```typescript
function extractPlateString(p: any): string {
  if (!p) return '';
  if (typeof p === 'string') return p;
  if (typeof p === 'object') return p.number || p.license_plate_number || '';
  return '';
}
```

Replace all `c.license_plate_number || c.license_plate || ...` patterns with this helper. Also add `c.registration` as a fallback (used by the inbox's `extractVehicleLabel`).

Affected locations:
- `executeLookupCustomer` vehicle IIFE (lines 1282, 1288)
- `storedCars` extraction (lines 1154, 1165, 1179)
- `license_plate` field on booking output (line 1306)
- `patchBookingInfo` car extraction (lines 578, 582, 592)
- `patchBookingConfirmed` car extraction (lines 730, 735, 796, 801)

### Fix B: Skip `patchBookingInfo` and `patchActionMenu` during active edit flows
Add guards at the top of both functions to skip when interactive edit markers are present:

```typescript
// In patchBookingInfo (after existing guards)
const activeFlowMarkers = ['[TIME_SLOT]', '[BOOKING_EDIT]', '[ADDRESS_SEARCH]', '[LICENSE_PLATE]', '[SERVICE_SELECT]', '[BOOKING_SUMMARY]'];
if (activeFlowMarkers.some(m => reply.includes(m))) return reply;

// Same guard in patchActionMenu
```

This prevents redundant booking cards and action menus from appearing when the user is already in an active edit sub-flow.

### Fix C: Ensure BOOKING_INFO appears after initial lookup
Add a debug log to capture when patchBookingInfo skips and why, and ensure the pipeline order correctly places BOOKING_INFO before any greeting text. The current logic at lines 644-650 already handles inserting before ACTION_MENU, so this should work. If the card is being lost, add a fallback that ensures BOOKING_INFO is always at the start of the message when booking data is present.

---

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

**All changes in one file:**

1. **New helper** `extractPlateString(p)` -- add near other helpers (around line 860)
2. **12 locations** -- replace `c.license_plate_number || c.license_plate || ...` with `extractPlateString(c.license_plate_number || c.license_plate || c.registration)`
3. **Line 496** -- add active flow marker guard in `patchBookingInfo`
4. **Line 662** -- add active flow marker guard in `patchActionMenu`

### Deploy
Re-deploy `widget-ai-chat` edge function.

## Expected Results
1. Car shows "Tesla Model y (EC94156)" instead of "Tesla Model y ([object Object])"
2. When user is in TIME_SLOT selection, no redundant BOOKING_INFO or ACTION_MENU appears
3. BOOKING_INFO card reliably shows after initial customer lookup with all 5 fields populated

