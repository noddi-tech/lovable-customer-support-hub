
# Fix: Cancelled Bookings Shown + Wrong Flow After Group Selection

## Two Root Causes Found

### Issue 1: Cancelled bookings pass through the status filter

The `bookings-for-customer` Noddi endpoint returns status as an **object** like `{ id: 3 }` (not always with a `name` or `slug` field). The current filter logic at line 1410 handles this case by doing `String(rawStatus.id)` which produces `"3"` -- but the exclusion list at line 1413 only checks for string names like `'cancelled'`, not numeric string equivalents. So cancelled bookings slip through.

**Fix**: When the status is an object with a numeric `id`, map it through `STATUS_MAP` (0=draft, 1=confirmed, 2=assigned, 3=cancelled, 4=completed) before comparing against the exclusion list.

```text
Current (broken):
  object { id: 3 } -> String(3) -> "3" -> NOT in ['cancelled',...] -> passes filter

Fixed:
  object { id: 3 } -> STATUS_MAP[3] -> "cancelled" -> IN ['cancelled',...] -> filtered out
```

**File**: `supabase/functions/widget-ai-chat/index.ts`, lines 1404-1421

Change line 1410 from:
```typescript
: typeof rawStatus === 'object' && rawStatus !== null
  ? (rawStatus.name || rawStatus.slug || String(rawStatus.id || ''))
```
to:
```typescript
: typeof rawStatus === 'object' && rawStatus !== null
  ? (rawStatus.name || rawStatus.slug || STATUS_MAP[rawStatus.id] || String(rawStatus.id || ''))
```

This ensures that when the status is `{ id: 3 }`, it maps to `"cancelled"` and gets filtered out.

Apply the same fix to the status display mapping at line 1427 for consistency.

### Issue 2: AI shows existing bookings for a "new booking" intent

After group selection, the AI calls `lookup_customer` again with the selected `user_group_id`. The response includes bookings, and the AI -- having lost the original `matchedFlowHint` context from the `__VERIFIED__` stage -- sees the bookings and presents them as selectable options, even though the user said "I want to make a booking."

**Fix**: Add stronger instructions to the system prompt (around line 1779) to reinforce that the `new_booking` flow should NEVER show existing bookings. The AI should skip straight to the first step (address selection).

Add to the system prompt instructions:
```
CRITICAL: For the "new_booking" flow, NEVER show existing bookings or a [BOOKING_SELECT] block.
Go directly to address selection ([ADDRESS_SEARCH]).
Only show [BOOKING_SELECT] for flows that explicitly require selecting an existing booking
(e.g., change_time, change_address, cancel_booking).
```

## File Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | 1) Fix status object filter to map numeric IDs through STATUS_MAP (lines 1410, 1427) |
| `supabase/functions/widget-ai-chat/index.ts` | 2) Add system prompt instruction to never show BOOKING_SELECT for new_booking flow (around line 1779) |

## Expected Results
- Cancelled bookings (status 3) are correctly filtered out regardless of whether status comes as a number, string, or object
- When user says "I want to make a booking," the AI goes directly to address selection without showing existing bookings
- Change/cancel flows still show booking selection as expected
