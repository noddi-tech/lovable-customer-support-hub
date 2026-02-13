

# Fix: Time Slot Not Showing + Wrong UTC Time Display

## Two Issues Found

### Issue 1: AI displays booking times in UTC instead of Norwegian time
The `executeGetBookingDetails` and `executeLookupCustomer` functions return raw UTC timestamps (e.g., `2026-02-16T06:00:00Z`) directly to the AI. The AI then displays "kl. 06:00" when the correct Norwegian time (Europe/Oslo, UTC+1) would be "kl. 07:00".

**Fix**: Convert `scheduledAt` and `endTime` to Europe/Oslo timezone strings before returning them to the AI, so it always shows localized times in its text responses.

### Issue 2: AI doesn't emit [TIME_SLOT] marker for time change flow
The BOOKING EDIT FLOW instructions (line 876-880) are too vague: "Detect what they want to change and show the appropriate marker." The AI instead asks a plain-text confirmation question and never shows the time slot picker. The instructions need to explicitly tell the AI to emit the `[TIME_SLOT]` marker when the customer wants to change their booking time.

## Changes

### File 1: `supabase/functions/widget-ai-chat/index.ts`

**A) Add UTC-to-Oslo time conversion helper** (new function near top of file):

```typescript
function toOsloTime(utcIso: string): string {
  try {
    const d = new Date(utcIso);
    if (isNaN(d.getTime())) return utcIso;
    return d.toLocaleString('nb-NO', {
      timeZone: 'Europe/Oslo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch { return utcIso; }
}
```

**B) Convert times in `executeLookupCustomer`** (around line 529):
Apply `toOsloTime()` to `scheduledAt` and `endTime` in the bookings array so the AI receives localized times.

**C) Convert times in `executeGetBookingDetails`** (around line 564):
Apply `toOsloTime()` to `scheduledAt` and `endTime` so the AI displays correct Norwegian time.

**D) Expand BOOKING EDIT FLOW instructions** (around line 876):
Add explicit instructions for time changes:

```
BOOKING EDIT FLOW:
When a customer wants to modify an existing booking:
1. Use get_booking_details to fetch the current booking
2. Confirm with the customer which booking they want to change
3. For TIME changes: emit the [TIME_SLOT] marker with the booking's address_id, car_ids, and license_plate:
   [TIME_SLOT]{"address_id": <booking_address_id>, "car_ids": [<booking_car_ids>], "license_plate": "<booking_license_plate>", "sales_item_id": <first_sales_item_id>}[/TIME_SLOT]
   After the customer selects a new time, show [BOOKING_EDIT] with old and new values.
4. For ADDRESS changes: emit [ADDRESS_SEARCH]
5. For SERVICE changes: emit [SERVICE_SELECT]
6. After collecting the new value, show [BOOKING_EDIT] with old and new values
```

## Scope

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Add `toOsloTime` helper; convert booking times to Oslo timezone in tool responses; expand BOOKING EDIT FLOW to explicitly emit [TIME_SLOT] for time changes |

