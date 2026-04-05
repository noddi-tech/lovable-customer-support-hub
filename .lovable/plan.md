

# Enrich Bulk Outreach Recipients via Customer Lookup

## Problem

The current `extractBookingInfo()` in `bulk-outreach` fails because `/v1/bookings/` returns minimal booking objects missing the fields it checks. Meanwhile, `noddi-customer-lookup` already has battle-tested extraction logic and fetches bookings from richer endpoints (`/v1/user-groups/{id}/bookings-for-customer/`).

## Approach

After resolving a plate to a contact (email/phone), call `noddi-customer-lookup` internally to fetch their booking data. This reuses all existing extraction logic without duplication.

## Changes

### 1. Edge function: add customer-lookup enrichment step

**File:** `supabase/functions/bulk-outreach/index.ts`

- After `resolvePlate()` returns a matched contact with email or phone, invoke `noddi-customer-lookup` via the Supabase client to get the customer's priority booking.
- Extract from the response:
  - `data.booking_date_iso` → `booking_date`
  - `data.service_title` → `booking_service`
  - `data.priority_booking.delivery_window_starts_at` + `delivery_window_ends_at` → `booking_time` (formatted as "HH:MM-HH:MM")
- Apply this in the `resolve_plates` action loop, after each successful resolution.
- Remove `fetchNearestBookingForCar()` calls from each resolution path (they never worked correctly anyway).

### 2. Clean up dead code

**File:** `supabase/functions/bulk-outreach/index.ts`

- Remove `extractBookingInfo()` function (lines 22-71)
- Remove `fetchNearestBookingForCar()` function (lines 73-91)
- Remove all `extractBookingInfo()` and `fetchNearestBookingForCar()` calls scattered through resolution strategies
- Keep `extractBookingInfo` only in `list_route_bookings` if still needed there, or replace it with the same customer-lookup approach

### 3. No frontend changes needed

The `Recipient` type, review table, message composer, and send payload already support `booking_date`, `booking_time`, `booking_service`. Only the data source changes.

### 4. Redeploy edge function

## Technical flow

```text
Current (broken):
  resolvePlate → matched → fetchNearestBookingForCar → extractBookingInfo (wrong field paths) → nulls

Fixed:
  resolvePlate → matched (email/phone) → invoke noddi-customer-lookup → get priority_booking with booking_date_iso, service_title → populate booking fields
```

## Files to change

- `supabase/functions/bulk-outreach/index.ts`

