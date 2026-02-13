

# Fix: Recover delivery_window_start/end in BookingEditConfirmBlock

## Problem

The AI emits `[BOOKING_EDIT]` with `delivery_window_id` but omits `delivery_window_start` and `delivery_window_end`. The proxy now correctly rejects this with a 400 error. We need a client-side fallback to recover these values.

## Root Cause

The `BookingEditConfirmBlock` (line 29-33) passes `data.changes.delivery_window_start` and `data.changes.delivery_window_end` directly -- but the AI doesn't include them. Unlike `BookingSummaryBlock`, there is no localStorage recovery for the time slot selection.

## Fix (1 file)

**File: `src/widget/components/blocks/BookingEditConfirmBlock.tsx`**

In `handleConfirm`, after setting `delivery_window_id` from `data.changes`, add a localStorage scan to recover the start/end times if they're missing:

```typescript
if (data.changes?.delivery_window_id) {
  payload.delivery_window_id = data.changes.delivery_window_id;
  payload.delivery_window_start = data.changes.delivery_window_start;
  payload.delivery_window_end = data.changes.delivery_window_end;

  // Recovery: if start/end missing, scan localStorage for TimeSlotBlock selection
  if (!payload.delivery_window_start || !payload.delivery_window_end) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('noddi_action_')) continue;
      try {
        const val = JSON.parse(localStorage.getItem(key) || '');
        if (val.delivery_window_id === data.changes.delivery_window_id ||
            val.delivery_window_id === Number(data.changes.delivery_window_id)) {
          if (!payload.delivery_window_start && val.start_time) {
            payload.delivery_window_start = val.start_time;
          }
          if (!payload.delivery_window_end && val.end_time) {
            payload.delivery_window_end = val.end_time;
          }
          break;
        }
      } catch {}
    }
  }
}
```

This mirrors the existing recovery pattern in `BookingSummaryBlock` (lines 71-79) and ensures the start/end times are always present when updating a booking's time slot.

## Scope

| File | Change |
|------|--------|
| `src/widget/components/blocks/BookingEditConfirmBlock.tsx` | Add localStorage recovery for `delivery_window_start` and `delivery_window_end` when missing from AI output |

