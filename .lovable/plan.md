

# Fix Bulk Outreach Plate Resolution

## Problem
The `resolvePlate` function in `bulk-outreach/index.ts` calls `/v1/cars/from-license-plate-number/` which returns car details (make, model, id) but **does not include `user_group` data**. The code then checks `carData?.user_group?.id` which is always undefined, so every plate shows "Not found".

## Root Cause
The Noddi car lookup API returns car metadata only. There is no direct plate-to-customer endpoint. The link between a car and a customer exists through **bookings** — a booking ties a `car_id` to a `user_group_id`.

## Solution
Update `resolvePlate` to use a two-step approach:

1. **Look up car** via `/v1/cars/from-license-plate-number/` to get the `car_id`
2. **Search bookings** using the Noddi bookings API filtered by `car_id` to find which user group (customer) has booked with that car
3. **Fetch user group** details to get contact info (name, email, phone)

If the bookings approach doesn't yield results, fall back to searching the **local `customers` table** for any customer whose metadata or prior bookings reference that plate.

### File Changes

| File | Change |
|---|---|
| `supabase/functions/bulk-outreach/index.ts` | Rewrite `resolvePlate` to use car_id → bookings → user_group lookup chain, plus local DB fallback |

### Also: Fix 14 Build Errors
The build has 14 TypeScript errors across edge functions (mostly `'error' is of type 'unknown'` and a widget-config type issue). These will be fixed in the same pass:

- **9 files**: Cast `error` to `Error` before accessing `.message` (`send-ticket-notification`, `slack-daily-digest`, `slack-integration`, `slack-list-channels`, `sync-unlinked-calls` x2, `test-aircall-credentials`, `update-service-ticket`, `update-ticket-status`, `wipe-organization-data`)
- **widget-config**: Fix the `.select()` return type by adding `.single()` or accessing array index for the joined `organizations`/`inboxes` data

