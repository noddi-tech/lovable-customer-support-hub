
# Fix: Booking Time Display and Crash Issues

## Root Causes

### Issue 1: Time shows "07:00" instead of "07:00-12:00"
The booking data sent to the AI includes `scheduledAt: "16.02.2026, 07:00"` and `endTime: "16.02.2026, 12:00"` as separate fields. The AI just picks the start time. We need to provide a pre-formatted `timeSlot` field like `"07:00–12:00"` and instruct the AI to always use it.

### Issue 2: `status` passed as raw object
Lines 595 and 630 pass `status: b.status` directly. Since the Noddi API returns status as an object (e.g., `{"id": 1, "name": "confirmed"}`), the AI receives garbled JSON. This needs to be normalized to a string.

### Issue 3: Crash after "ja"
The AI asks "Do you want to change the time?" as plain text. When the user says "ja", the AI doesn't know how to proceed (no structured flow). The prompt should instruct the AI to use `[YES_NO]` for booking confirmation questions, or skip the confirmation and go directly to `[TIME_SLOT]`.

---

## Technical Changes

### File: `supabase/functions/widget-ai-chat/index.ts`

**A) Add `timeSlot` field and normalize `status` in `executeLookupCustomer`** (~line 593-606)

Replace the booking mapping to:
- Extract status as a string from the object
- Add a `timeSlot` field combining start and end times (e.g., `"07:00–12:00"`)

```typescript
.slice(0, 10).map((b: any) => {
  const rawStatus = b.status;
  const statusStr = typeof rawStatus === 'string' ? rawStatus
    : typeof rawStatus === 'object' && rawStatus !== null ? (rawStatus.name || rawStatus.slug || '')
    : '';
  const startFull = toOsloTime(b.start_time || b.scheduled_at || b.delivery_window_starts_at || '');
  const endFull = toOsloTime(b.end_time || b.delivery_window_ends_at || '');
  // Extract HH:MM from "16.02.2026, 07:00" format
  const startHM = startFull.split(', ')[1] || startFull;
  const endHM = endFull.split(', ')[1] || endFull;
  return {
    id: b.id,
    status: statusStr,
    scheduledAt: startFull,
    endTime: endFull,
    timeSlot: `${startHM}\u2013${endHM}`,
    // ... rest of fields unchanged
  };
})
```

**B) Same fix in `executeGetBookingDetails`** (~line 628-640)

Normalize `status` and add `timeSlot` field.

**C) Add prompt instruction about time display** (~line 968)

Add to the MULTI-TURN CONTEXT section:
```
BOOKING TIME DISPLAY:
- ALWAYS present booking times as a full time range (e.g., "07:00–12:00"), NEVER as a single time (e.g., "07:00").
- Use the 'timeSlot' field from booking data which contains the pre-formatted range.
- When asking about a booking, say "planlagt den 16. februar 2026 kl. 07:00–12:00" NOT "kl. 07:00".
```

**D) Add instruction to skip text confirmation** (~line 945-951)

Strengthen the booking edit flow to use [YES_NO] or skip confirmation entirely:
```
When a customer wants to modify an existing booking:
1. Use get_booking_details to fetch the current booking
2. If the customer has only ONE active booking, skip confirmation and ask what they want to change using [ACTION_MENU].
3. If multiple bookings, ask which one using [ACTION_MENU] with booking options.
4. NEVER ask plain text yes/no questions. Use [YES_NO] or [ACTION_MENU] markers.
```

---

## Summary

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | Time shows "07:00" not "07-12" | AI only uses `scheduledAt`, ignores `endTime` | Add pre-formatted `timeSlot` field + prompt instruction |
| 2 | Status is garbled object | `b.status` is an object, passed raw | Normalize to string |
| 3 | Crash after "ja" | AI asks text question, can't handle plain "ja" response | Instruct to use interactive markers, skip text confirmations |
