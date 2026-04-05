

# Fix Booking Date/Time Formatting in Review Table

## Problem

The booking column shows raw ISO timestamps (`2026-04-06T05:00:00Z`) and UTC times (`05:00-10:00`) instead of user-friendly, timezone-aware values (`06.04.26` and `07:00-12:00` in Oslo time).

Two issues:
1. **Edge function** returns raw ISO date and UTC-based times (uses `toTimeString()` which depends on server timezone, not user's)
2. **Frontend** displays these raw values without any formatting or timezone conversion

## Changes

### 1. Frontend: format booking date/time with user's timezone

**File:** `src/components/bulk-outreach/RecipientReview.tsx`

- Import `useDateFormatting` hook (already used elsewhere in the app)
- Keep `booking_date` as raw ISO from the API (it's the data source)
- Format display using the user's timezone:
  - Date: format as `dd.MM.yy` (e.g., "06.04.26") using `formatInTimeZone`
  - Time: convert UTC start/end timestamps to user's local timezone, display as `HH:mm-HH:mm`

To support timezone conversion of the time window, the edge function should pass the raw UTC timestamps instead of pre-formatted strings.

### 2. Edge function: pass raw UTC timestamps for time window

**File:** `supabase/functions/bulk-outreach/index.ts`

In `enrichWithBookingData`, instead of formatting `bookingTime` as `HH:mm-HH:mm` using server's `toTimeString()`, pass the raw ISO start/end timestamps:
- `booking_time_start`: raw ISO string (e.g., `2026-04-06T05:00:00Z`)
- `booking_time_end`: raw ISO string (e.g., `2026-04-06T10:00:00Z`)
- Keep `booking_time` as a formatted fallback for the message template (formatted in Oslo time since that's the business timezone)

### 3. Frontend type update

**File:** `src/components/bulk-outreach/RecipientReview.tsx`

Add to `Recipient` interface:
- `booking_time_start?: string | null`
- `booking_time_end?: string | null`

### 4. Frontend: format in review table

**File:** `src/components/bulk-outreach/RecipientReview.tsx`

In the booking cell:
- Date: `format(new Date(r.booking_date), 'dd.MM.yy')` using `date-fns-tz` `formatInTimeZone` with user's timezone
- Time: convert `booking_time_start`/`booking_time_end` to user timezone and display as `HH:mm-HH:mm`
- Service: display as-is (already human-readable)

### 5. Pass new fields through state

**File:** `src/pages/BulkOutreach.tsx`

Map `booking_time_start` and `booking_time_end` from edge function response into recipient state.

## Files to change

- `supabase/functions/bulk-outreach/index.ts` — pass raw UTC timestamps + Oslo-formatted fallback
- `src/components/bulk-outreach/RecipientReview.tsx` — timezone-aware formatting using `useDateFormatting`
- `src/pages/BulkOutreach.tsx` — pass new timestamp fields through state

