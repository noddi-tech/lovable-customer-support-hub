
# Comprehensive Fix: Booking Edit Flow (4 Issues)

## Issue Analysis

### Issue 1: Show only active bookings
When the AI looks up a customer, it returns ALL bookings including completed and cancelled ones. For the "change booking" flow, only upcoming/confirmed bookings are relevant.

**Root cause:** `executeLookupCustomer` (line 571) does `bookings.slice(0, 10)` with no status filter.

**Fix:** Filter bookings to exclude completed, cancelled, and past statuses before returning them to the AI.

### Issue 2: AI asks text confirmation instead of going straight to BOOKING_EDIT
After the customer selects a time slot, the AI sends a plain text message ("Vil du bekrefte endringen...") with Yes/No thumbs -- instead of immediately showing the `[BOOKING_EDIT]` interactive card.

**Root cause:** The system prompt (line 929) says "After the customer selects a new time, show [BOOKING_EDIT]" but isn't forceful enough. The AI adds an intermediate conversational step.

**Fix:** Make the instruction explicit and absolute: after TIME_SLOT selection, the ENTIRE next response MUST be ONLY the `[BOOKING_EDIT]` marker. No text, no recap, no confirmation question.

### Issue 3: BOOKING_EDIT card shows UTC times instead of Oslo times
The confirm card shows "07:00-12:00 -> 08:00-11:00". The old time is correct (Oslo), but the new time is in UTC (08:00 UTC = 09:00 Oslo). The customer selected "09:00-12:00" in the TimeSlotBlock.

**Root cause:** The AI constructs the `time` display field from the user's time slot selection payload, which stores times in UTC. The `patchBookingEdit` function patches the API fields (`delivery_window_start/end`) but doesn't fix the display field.

**Fix:** Enhance `patchBookingEdit` to also convert and fix the `time` display field from UTC to Oslo timezone.

### Issue 4: "Booking updated!" shown but booking not actually changed
The proxy logged: `{"delivery_window":{"id":677,"starts_at":"2026-02-19T08:00:00Z","ends_at":"2026-02-19T11:00:00Z"}}` and Noddi returned 200, but the booking still shows the old time (Feb 16, 07:00-12:00).

**Root cause:** The Noddi API documentation explicitly states delivery windows use `pk` as their primary identifier, NOT `id`. The TimeSlotBlock's fallback chain (line 208) tries `window.id` FIRST before `window.pk`. If the API returns both fields with different values, we capture the wrong one. Noddi likely silently accepts the PATCH with a non-matching `id` value but doesn't actually apply the change.

**Fix:** Reverse the priority in TimeSlotBlock to try `pk` first: `window.pk || window.id || ...`

---

## Technical Changes

### File 1: `supabase/functions/widget-ai-chat/index.ts`

**A) Filter bookings by status** (line 571)

Change:
```typescript
bookings: bookings.slice(0, 10).map(...)
```
To:
```typescript
bookings: bookings
  .filter((b: any) => {
    const status = (b.status || '').toLowerCase();
    return !['completed', 'cancelled', 'canceled', 'no_show', 'expired'].includes(status);
  })
  .slice(0, 10)
  .map(...)
```

**B) Strengthen BOOKING_EDIT flow instruction** (line 929)

Change:
```
After the customer selects a new time, show [BOOKING_EDIT] with old and new values.
```
To:
```
After the customer selects a new time from [TIME_SLOT], your ENTIRE next response must be ONLY the [BOOKING_EDIT] marker with the old and new values as JSON. Do NOT write any introductory text, recap, or ask for text confirmation. Go directly to [BOOKING_EDIT].
```

**C) Enhance `patchBookingEdit` to fix display times** (line 404-435)

After injecting `delivery_window_start` and `delivery_window_end`, also convert them to Oslo timezone and update the `time` display field in `changes`:

```typescript
// Also fix the display 'time' field to use Oslo timezone
if (changes.delivery_window_start && changes.delivery_window_end) {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Oslo' });
  };
  changes.time = `${fmt(changes.delivery_window_start)}\u2013${fmt(changes.delivery_window_end)}`;
}
```

This runs regardless of whether the start/end were just injected or already present (since the AI may have used UTC for the display field too).

### File 2: `src/widget/components/blocks/TimeSlotBlock.tsx`

**D) Fix delivery window ID priority** (line 208)

Change:
```typescript
const windowId = window.id || window.pk || window.delivery_window_id || window.delivery_window?.id;
```
To:
```typescript
const windowId = window.pk || window.delivery_window_id || window.id || window.delivery_window?.id;
```

This matches the Noddi API documentation which states `pk` is the primary identifier for delivery windows.

### File 3: `src/widget/components/blocks/BookingEditConfirmBlock.tsx`

**E) Convert display times to Oslo timezone in the component** (lines 131-137)

Add a helper to convert UTC ISO strings to Oslo HH:MM format, and use it to ensure the displayed times are always in local time:

```typescript
const formatOsloTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Oslo' });
  } catch { return iso; }
};
```

Then when building the `time` row, if `delivery_window_start`/`end` are available, use the converted Oslo times instead of the raw `time` field.

---

## Summary

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Show only active bookings | `widget-ai-chat/index.ts` | Filter out completed/cancelled statuses |
| 2 | AI asks text confirmation | `widget-ai-chat/index.ts` | Strengthen prompt: go directly to BOOKING_EDIT |
| 3 | UTC times in BOOKING_EDIT | `widget-ai-chat/index.ts` + `BookingEditConfirmBlock.tsx` | Convert times to Oslo in patchBookingEdit and component |
| 4 | Booking not actually updated | `TimeSlotBlock.tsx` | Prioritize `pk` over `id` for delivery window ID |
