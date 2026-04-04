

# Fix Bulk Outreach Plate Resolution

## Problem

The `resolvePlate()` function finds cars via the API but fails to extract contact info because:

1. **Car response contacts are ignored** -- `/v1/cars/from-license-plate-number/` returns `user_group.users[]` with `email`, `phone_number`, `first_name`, `last_name`. The code only checks `carData.user` and `carData.owner` (lines 55-59), completely missing `carData.user_group.users[0]`.

2. **Booking search is a dead end** -- `/v1/bookings/` returns `UserGroupRecordListMinimal` which only has `id`, `name`, `slug`. No `members[]`, no `users[]`, no email. So `extractContactFromBooking()` always returns null.

3. **Missing second-hop enrichment** -- When booking search finds a `user_group.id`, the code never calls `/v1/user-groups/{id}/` to get full member records with contact info.

## Plan

### 1. Read contacts directly from car lookup response

In `resolvePlate()`, after lines 54-60, add extraction from:
- `carData.user_group.users[0]` -- the primary path per OpenAPI spec
- `carData.owners_current[0].user_group.users[0]` -- ownership fallback

This alone should fix most plates since car lookup already succeeds.

### 2. Add second-hop enrichment to booking search

In `resolveFromBookingSearch()`, when a booking is found but `extractContactFromBooking()` returns null:
- Extract `user_group_id` from `booking.user_group.id`
- Call `GET /v1/user-groups/{user_group_id}/` to get the full record with `members[].user.email`
- Extract contact from the enriched response

### 3. Fix `extractContactFromBooking` to match real schema

Update to also check:
- `booking.user_group.users[0].email` (in addition to existing `members[0]`)

### 4. Fix `plateMatchesBooking` for cache lookups

Add checks for `booking.booking_items[].car.license_plate_number` (confirmed schema field).

## Files to change

- `supabase/functions/bulk-outreach/index.ts` -- all fixes above
- Redeploy the edge function

## Technical detail

```text
Current (broken):
  car lookup → check carData.user (missing) → check carData.owner (missing) → skip user_group.users
  booking search → extractContactFromBooking looks for booking.user.email (not in minimal response) → fail

Fixed:
  car lookup → check carData.user_group.users[0].email ← NEW, primary fix
            → check carData.owners_current[0].user_group.users[0].email ← NEW
  booking search → extract user_group.id → GET /v1/user-groups/{id}/ → members[0].user.email ← NEW second hop
```

