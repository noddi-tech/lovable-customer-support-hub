

# Add Upcoming Booking Info to Bulk Outreach

## Goal

Enrich each resolved recipient with their nearest upcoming (or most recent) booking details so the message template can reference booking-specific variables like `{booking_date}`, `{booking_time}`, `{booking_service}`.

## What changes

### 1. Edge function: enrich resolved plates with booking data

**File:** `supabase/functions/bulk-outreach/index.ts`

After resolving a plate to a contact, fetch the nearest booking for that customer. The car lookup already provides `carId`, and the booking search already runs -- we just need to capture and return booking fields from those results instead of discarding them.

Add to each resolved result:
- `booking_id` (number or null)
- `booking_date` (string or null, e.g. "2026-04-10")
- `booking_time` (string or null, e.g. "08:00-12:00")
- `booking_service` (string or null, e.g. "Dekkskift")
- `booking_status` (string or null)

Sources (in priority order):
1. Already-fetched bookings from `resolveFromBookingSearch` -- extract date/service from the booking that matched
2. If contact was resolved from car user_group directly (no booking searched yet), do one quick `GET /v1/bookings/?car_ids={carId}&page_size=1&ordering=-created_at` to grab the nearest booking
3. Cache hits: extract from `cached_priority_booking`

### 2. Frontend: extend Recipient type with booking fields

**File:** `src/components/bulk-outreach/RecipientReview.tsx`

Add optional fields to `Recipient` interface:
- `booking_date?: string`
- `booking_time?: string`  
- `booking_service?: string`

Show booking info in the review table as a new column or as a subtitle under the name.

### 3. Frontend: pass booking data through state

**File:** `src/pages/BulkOutreach.tsx`

Map the new fields from the edge function response into the `Recipient` objects so they flow through to the review and send steps.

### 4. Message composer: add booking template variables

**File:** `src/components/bulk-outreach/MessageComposer.tsx`

- Add badges for `{booking_date}`, `{booking_time}`, `{booking_service}` alongside the existing `{name}` hint
- Update the preview to replace these variables with sample values

### 5. Edge function: replace booking variables on send

**File:** `supabase/functions/bulk-outreach/index.ts` (in `send_bulk` action)

Extend the personalization at line 546 to also replace `{booking_date}`, `{booking_time}`, `{booking_service}` from the recipient data passed by the frontend. The `send_bulk` recipients array will now include these fields.

### 6. Frontend: pass booking fields in send payload

**File:** `src/pages/BulkOutreach.tsx`

In `handleSend`, include `booking_date`, `booking_time`, `booking_service` in each recipient object sent to the edge function.

## Technical detail

```text
Current flow:
  resolve plate → return { plate, name, email, phone, matched }
  send_bulk → replace {name} only

New flow:
  resolve plate → also capture nearest booking → return { ..., booking_date, booking_time, booking_service }
  send_bulk → replace {name}, {booking_date}, {booking_time}, {booking_service}
```

## Files to change

- `supabase/functions/bulk-outreach/index.ts` -- enrich resolve + expand send personalization
- `src/components/bulk-outreach/RecipientReview.tsx` -- extend Recipient type, show booking column
- `src/pages/BulkOutreach.tsx` -- pass booking fields through state and send payload
- `src/components/bulk-outreach/MessageComposer.tsx` -- add variable hints and preview
- Redeploy edge function

