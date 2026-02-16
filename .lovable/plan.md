

# Fix: Booking Edit Flow -- Booking ID, Duplicate Prompts, and Booking Info Component

## Three Issues

### 1. New Interactive Block: `[BOOKING_INFO]` Component
**Problem**: When the AI describes the current booking before asking what to change, it uses plain text bullet points (screenshot 5: "Adresse: ..., Dato: ..., Naavaerende tid: ..."). This should be a styled card component instead.

**Solution**: Create a new `BookingInfoBlock` with marker `[BOOKING_INFO]...[/BOOKING_INFO]` that renders a clean card showing address, date, time, and optionally service/car. Update the system prompt to instruct the AI to use this marker instead of bullet points.

**New file**: `src/widget/components/blocks/BookingInfoBlock.tsx`

The card will display:
- Header: "Bestilling #{id}" with a calendar icon
- Rows for address, date, time, service, car (whichever are present)
- Styled consistently with the existing `BookingConfirmedBlock` pattern (bordered card, rows with label + value)

Register the block in `src/widget/components/blocks/index.ts`.

### 2. Missing `booking_id` Causing 400 Error
**Problem**: The `patchBookingEdit` function scans for `toolResult.booking?.id` and `toolResult.bookings[0].id` but the `lookup_customer` response stores booking IDs directly on bookings array items (line 719: `id: b.id`). The scan works for this. However, the AI is still emitting `booking_id: 0` or omitting it entirely, and the `patchBookingEdit` override only works if `realBookingId !== editData.booking_id` -- but if `editData.booking_id` is `undefined` or `0`, the comparison `realBookingId !== 0` is true, so it should work.

The real issue: When the AI calls `get_booking_details` with a placeholder ID (<=10), the tool returns an error string instead of booking data. The `patchBookingEdit` scan then finds this error object (which has no `.booking.id` or `.bookings[]`), so `realBookingId` stays `null`. The fix: also scan for `toolResult.id` directly (the `lookup_customer` bookings array items have `id` at the top level).

Additionally, ensure that if `realBookingId` is still null and `editData.booking_id` is falsy/0, do a fresh lookup from `executeLookupCustomer` (same pattern as `patchBookingSummary`).

**File**: `supabase/functions/widget-ai-chat/index.ts` (~line 469-493)

### 3. Duplicate "Endre tid" Prompts (AI Asks Twice)
**Problem**: Screenshots show the AI asking "Er dette tidspunktet du onsker a endre til?" as a YES_NO, then after the user clicks Yes, the AI fetches details again and shows another time slot picker. The root cause: the system prompt says "After the customer selects a new time from [TIME_SLOT], your ENTIRE next response must be ONLY the [BOOKING_EDIT] marker" but the AI instead asks a confirmation question first.

**Fix**: Strengthen the system prompt to be even more explicit: after TIME_SLOT selection, go DIRECTLY to [BOOKING_EDIT]. No intermediate YES_NO. Also add a post-processor that detects when the AI emits YES_NO immediately after a TIME_SLOT user selection and strips it, replacing with a forced [BOOKING_EDIT] attempt.

**File**: `supabase/functions/widget-ai-chat/index.ts` (~line 1117)

---

## Technical Details

### New File: `src/widget/components/blocks/BookingInfoBlock.tsx`

- Marker: `[BOOKING_INFO]{"booking_id": 123, "address": "Slemdalsvingen 65, Oslo", "date": "17. feb 2026", "time": "07:00-12:00", "service": "Dekkskift", "car": "Tesla Model Y"}[/BOOKING_INFO]`
- Styled card similar to `BookingConfirmedBlock` but with blue/neutral theme (not green)
- Register in block registry with `type: 'booking_info'`

### File: `src/widget/components/blocks/index.ts`

- Add `import './BookingInfoBlock';`

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change A** (~line 469-493): Improve booking ID extraction in `patchBookingEdit`:
- Also check `toolResult.id` (direct booking ID from lookup_customer array items)
- If `realBookingId` is still null and `editData.booking_id` is falsy, do a fresh customer lookup using visitor phone/email (same as `patchBookingSummary` does)
- This requires passing `visitorPhone` and `visitorEmail` to `patchBookingEdit`

**Change B** (~line 1096-1120): Update system prompt:
- Add `[BOOKING_INFO]` marker documentation with example
- Strengthen the "after TIME_SLOT selection" instruction: "NEVER ask YES_NO after a time slot selection. Go DIRECTLY to [BOOKING_EDIT]."
- Add: "When presenting current booking details before asking what to change, use [BOOKING_INFO] marker instead of bullet points."

**Change C** (~line 1455): Where `patchBookingEdit` is called, also pass visitor phone/email so it can do a fresh lookup as fallback.

### Deploy

Re-deploy `widget-ai-chat` edge function.

## Expected Result

1. Current booking details shown in a styled card (not bullet points)
2. Correct `booking_id` always used (fresh lookup fallback)
3. No duplicate confirmation prompts after time slot selection

