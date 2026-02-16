
# Fix: Proper Booking Status Filtering in AI Chatbot

## Problem

The booking filter in `widget-ai-chat` doesn't handle numeric status codes from the Noddi API. The API returns statuses as integers:

| Code | Status |
|------|--------|
| 0 | Draft (not used) |
| 1 | Confirmed |
| 2 | Assigned to Route |
| 3 | Cancelled |
| 4 | Completed |

The current filter only handles `string` and `object` types, so a numeric `3` (Cancelled) or `4` (Completed) falls through to empty string and passes the filter -- appearing as "upcoming."

Additionally, bookings with past delivery windows (e.g., confirmed but already delivered) are not filtered out.

## Changes

### File: `supabase/functions/widget-ai-chat/index.ts`

**Update the booking filter** (around lines 583-592) and the **status display mapping** (around lines 594-596):

1. Add a numeric status code map:
```typescript
const STATUS_MAP: Record<number, string> = {
  0: 'draft',
  1: 'confirmed',
  2: 'assigned',
  3: 'cancelled',
  4: 'completed',
};
```

2. Update the filter to handle numeric statuses and past delivery windows:
```typescript
bookings: bookings
  .filter((b: any) => {
    const rawStatus = b.status;
    const status = (
      typeof rawStatus === 'number' ? (STATUS_MAP[rawStatus] || '')
      : typeof rawStatus === 'string' ? rawStatus
      : typeof rawStatus === 'object' && rawStatus !== null
        ? (rawStatus.name || rawStatus.slug || String(rawStatus.id || ''))
      : ''
    ).toLowerCase();

    // Exclude cancelled/completed/etc
    if (['completed', 'cancelled', 'canceled', 'no_show', 'expired', 'draft'].includes(status)) {
      return false;
    }

    // Exclude bookings whose delivery window has passed
    const endTime = b.end_time || b.delivery_window_ends_at;
    if (endTime && new Date(endTime) < new Date()) {
      return false;
    }

    return true;
  })
```

3. Update the status string mapping inside `.map()` to also handle numeric codes:
```typescript
const statusStr = typeof rawSt === 'number' ? (STATUS_MAP[rawSt] || String(rawSt))
  : typeof rawSt === 'string' ? rawSt
  : typeof rawSt === 'object' && rawSt !== null ? (rawSt.name || rawSt.slug || '') : '';
```

### Deploy

Re-deploy the `widget-ai-chat` edge function.

## Result

Only genuinely upcoming bookings (confirmed or assigned, with future delivery windows) will be shown to the customer. Cancelled (3), completed (4), draft (0), and past bookings will be excluded.
