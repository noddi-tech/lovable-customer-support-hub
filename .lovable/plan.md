
# Fix: Show Time Slot Range Instead of Single Start Time

## Problem

The AI tells the customer their booking is at "kl. 06:00" instead of "06:00-11:00" because the `lookup_customer` tool only returns `scheduledAt` (start time) and omits the end time. The booking is a time **window** (e.g., 06:00-11:00), not a single appointment time.

## Fix

**File: `supabase/functions/widget-ai-chat/index.ts`** -- `lookup_customer` bookings mapping (line 529)

Add the `endTime` field (which already exists in the `executeGetBookingDetails` response but is missing here):

```typescript
// Current (line 529):
scheduledAt: b.start_time || b.scheduled_at || b.delivery_window_starts_at,

// Updated -- add endTime on the next line:
scheduledAt: b.start_time || b.scheduled_at || b.delivery_window_starts_at,
endTime: b.end_time || b.delivery_window_ends_at || null,
```

This gives the AI both start and end times so it can present the booking as "06:00-11:00" instead of just "06:00".

## Scope

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Add `endTime` field to booking objects in `lookup_customer` (1 line) |

Redeploy `widget-ai-chat` edge function after the change.
