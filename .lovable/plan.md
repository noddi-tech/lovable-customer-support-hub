

# Fix: Missing `delivery_window_id` in Booking Flow

## Root Cause

The error `"missing":{"delivery_window_id":true}` happens because of two compounding issues:

1. **Server-side**: `patchBookingSummary` in `widget-ai-chat` scans conversation messages for the time slot selection but extracts `delivery_window_id: 0` (likely the AI never received the real ID, or the message format didn't match).

2. **Frontend**: In `BookingSummaryBlock.tsx`, the line `if (data.delivery_window_id)` treats `0` as falsy, so even a `0` value gets dropped from the payload. More importantly, when the AI fails to include the real `delivery_window_id`, there's no frontend fallback to recover it.

## Solution

Add a frontend fallback in `BookingSummaryBlock.tsx` that extracts the `delivery_window_id` from the TimeSlotBlock's localStorage entry when it's missing from the AI data. The TimeSlotBlock already saves `delivery_window_id` to `localStorage` under a key like `noddi_action_{messageId}:{blockIndex}`.

### Changes

**File: `src/widget/components/blocks/BookingSummaryBlock.tsx`**

In `handleConfirm()`, after the customer re-lookup block, add a delivery window recovery block:

```
// After customer re-lookup, recover delivery_window_id if missing
if (!bookingPayload.delivery_window_id) {
  // Scan localStorage for any time slot selection
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('noddi_action_') && key !== `noddi_action_${blockKey}`) {
      try {
        const val = JSON.parse(localStorage.getItem(key) || '');
        if (val.delivery_window_id) {
          bookingPayload.delivery_window_id = val.delivery_window_id;
          // Also grab start/end times if missing
          if (!bookingPayload.delivery_window_start && val.start_time) {
            bookingPayload.delivery_window_start = val.start_time;
          }
          if (!bookingPayload.delivery_window_end && val.end_time) {
            bookingPayload.delivery_window_end = val.end_time;
          }
          break;
        }
      } catch { /* not relevant JSON */ }
    }
  }
}
```

Also fix the truthy check -- change `if (data.delivery_window_id)` to `if (data.delivery_window_id != null)` so that a value of `0` (while unlikely for a real ID) doesn't get silently dropped.

### Summary of changes

- `BookingSummaryBlock.tsx`: Add localStorage scan fallback for `delivery_window_id` recovery from TimeSlotBlock's stored selection
- `BookingSummaryBlock.tsx`: Fix `if (data.delivery_window_id)` to use `!= null` check instead of truthiness, preventing `0` from being dropped

