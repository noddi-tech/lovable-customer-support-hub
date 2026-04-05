

# Show Time Slot + Service in Booking Column & Widen Card

## Problem

The booking column in the review table is not displaying the time slot or service name, even though the edge function returns this data. Additionally, the card uses `max-w-3xl` (768px) which is too narrow for a 6-column table.

## Root Cause

Based on the edge function logs, booking data IS being returned correctly (e.g., `time=05:00-15:00, service=Fornyelse dekkhotell med hjemlevert dekkskift`). The frontend code in RecipientReview.tsx already has rendering logic for time and service. Two likely causes:

1. **Edge function may need redeployment** — the latest code with `booking_time_start`/`booking_time_end` fields might not be deployed yet
2. **Fallback display needed** — if `booking_time_start` is null but `booking_time` (the formatted string) exists, nothing renders. The component should fall back to displaying `booking_time` directly.

## Changes

### 1. Redeploy edge function
Ensure the latest `enrichWithBookingData` code (with `booking_time_start`, `booking_time_end`, and `booking_service` fields) is deployed.

### 2. Add fallback time display in RecipientReview.tsx

**File:** `src/components/bulk-outreach/RecipientReview.tsx`

In the booking cell, if `booking_time_start` is not available, fall back to displaying `booking_time` (the pre-formatted Oslo-time string). This handles cases where the edge function returns the formatted time but not the raw timestamps:

```
{r.booking_time_start ? (
  <p>formatted start-end in user tz</p>
) : r.booking_time ? (
  <p>{r.booking_time}</p>
) : null}
```

### 3. Widen the container

**File:** `src/pages/BulkOutreach.tsx`

Change `max-w-3xl` to `max-w-5xl` (1024px) to give the table more breathing room for 6 columns.

### 4. Ensure service always shows

Currently `booking_service` only renders inside the `r.booking_date ?` block. If somehow date is missing but service exists, it won't show. Keep this as-is since service without a date is unlikely, but ensure the service line renders when present.

## Files to change

- `supabase/functions/bulk-outreach/index.ts` — redeploy (no code changes needed, just deploy)
- `src/components/bulk-outreach/RecipientReview.tsx` — add fallback for `booking_time`
- `src/pages/BulkOutreach.tsx` — widen container from `max-w-3xl` to `max-w-5xl`

