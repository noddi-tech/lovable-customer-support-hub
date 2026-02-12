

# Root Cause: `delivery_window_id` is Never Captured

## The Real Problem

All previous fixes (localStorage recovery, server-side patching, truthiness checks) were treating symptoms. The actual bug is much simpler:

The Noddi API's `/v1/delivery-windows/for-new-booking/` response returns window objects that **do not have a field called `id`**. The field is likely called `pk`, `delivery_window_id`, or something else. 

In `TimeSlotBlock.tsx` line 120, the code does:
```
delivery_window_id: window.id,   // <-- window.id is undefined!
```

Since `undefined` values are silently dropped by `JSON.stringify`, the user message sent to the AI contains only `{ date, start_time, end_time }` with no delivery window ID at all. This is exactly what your log screenshot shows.

Every downstream recovery mechanism fails because the ID was never captured in the first place -- there's nothing to recover.

## Evidence

Your second screenshot shows the user message payload:
```
{"date":"2026-02-16","start_time":"2026-02-16T08:00:00Z","end_time":"2026-02-16T11:00:00Z"}
```
No `delivery_window_id` field at all -- confirming it was `undefined` at capture time.

## Fix

### Change 1: Fix ID extraction in TimeSlotBlock (the actual fix)

**File: `src/widget/components/blocks/TimeSlotBlock.tsx`**

Update `handleSlotSelect` to try multiple possible field names from the Noddi API response:

```typescript
const handleSlotSelect = (window: any) => {
    const currentDate = sortedDates[selectedIdx];
    const windowId = window.id || window.pk || window.delivery_window_id 
                     || window.delivery_window?.id;
    const payload = JSON.stringify({
      delivery_window_id: windowId,
      date: currentDate,
      start_time: window.start_time || window.starts_at,
      end_time: window.end_time || window.ends_at,
      price: window.price || window.total_price,
    });
    // ...
};
```

Also update the button `key` prop on line 199 from `w.id || i` to `w.id || w.pk || w.delivery_window_id || i`.

### Change 2: Add diagnostic logging (temporary)

Add a `console.log` of the first window object received from the API so we can confirm the exact field name Noddi uses. This will appear in the browser console and help verify the fix:

```typescript
if (flatWindows.length > 0) {
  console.log('[TimeSlotBlock] Sample window object keys:', Object.keys(flatWindows[0]), flatWindows[0]);
}
```

### Change 3: Keep existing safety nets

The existing recovery mechanisms in `BookingSummaryBlock.tsx` and `widget-ai-chat/index.ts` remain as safety nets, but once this fix is in place, they should rarely be needed since the ID will be properly captured at the source.

## Summary

- The core bug is a field name mismatch: `window.id` vs whatever Noddi actually calls it (`pk`, `delivery_window_id`, etc.)
- Fix the extraction to try multiple field names
- Add temporary logging to confirm the exact field name
- All existing recovery code stays as fallback protection

