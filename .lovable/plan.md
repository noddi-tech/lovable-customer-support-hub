

# Fix Booking Date Formatting in Emails & Preserve Line Breaks

## Problems

1. **Raw ISO date in sent emails**: The `{booking_date}` variable is replaced with `2026-04-06T05:00:00Z` instead of `06.04.26`. The edge function's `send_bulk` action does a straight string replacement with the raw ISO value from the recipient object.

2. **Line breaks lost**: The textarea produces `\n` characters which are passed as `message_template` to the edge function. The `send-reply-email` function does `.replace(/\n/g, '<br>')` on the stored content — but only on the `message.content` field read from the DB. The bulk outreach stores the personalized message directly, so `\n` should survive. However, if the content is being treated as HTML somewhere in the chain, newlines may be collapsed. We need to ensure `\n` → `<br>` conversion happens before storing the message content in the `send_bulk` action.

## Changes

### 1. Format template variables before substitution

**File:** `supabase/functions/bulk-outreach/index.ts`

In the `send_bulk` case (around line 675-679), format the booking values before substitution:

- `booking_date`: Convert from ISO to `dd.MM.yy` in `Europe/Oslo` timezone using `toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Oslo" })`
- `booking_time`: Already formatted in Oslo time by `enrichWithBookingData` — no change needed
- `booking_service`: Already human-readable — no change needed

Add a helper function:
```typescript
function formatBookingDateForEmail(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("nb-NO", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      timeZone: "Europe/Oslo"
    });
  } catch { return isoDate; }
}
```

### 2. Convert newlines to `<br>` before storing

**File:** `supabase/functions/bulk-outreach/index.ts`

After template variable replacement (line ~679), convert `\n` to `<br>` so the email renders with proper line breaks:

```typescript
personalizedMessage = personalizedMessage.replace(/\n/g, '<br>');
```

This ensures the content stored in the DB is already HTML-formatted, and `send-reply-email`'s own `\n` → `<br>` conversion becomes a no-op (no remaining `\n` to convert).

### 3. Redeploy edge function

## Files to change

- `supabase/functions/bulk-outreach/index.ts` — format date + convert newlines

