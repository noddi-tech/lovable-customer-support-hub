

# Fix Bulk Outreach: Bookings API Returns 400

## Root Cause

The edge function logs reveal the exact failure point:

```
Car found for EN31654: id=14484
Bookings fetch failed for car 14484: HTTP 400
```

**Every car is found successfully**, but the next step fails because `/v1/bookings/?car_ids=X` is not a valid Noddi API endpoint. It returns HTTP 400 for every request. This parameter does not exist in the Noddi API.

The local cache fallback also fails because the `noddi_customer_cache` table only has **4 entries total** (2 with bookings), and none of them contain the plates being searched. The `customers` table also has no plate data in metadata.

## Correct API Flow

Per the Noddi API docs, the way to get from a car to a customer is:
1. Car lookup by plate returns `car_id` (this works)
2. But there is **no bookings-by-car endpoint** -- bookings are fetched via `/v1/user-groups/{user_group_id}/bookings-for-customer/`

The missing link: we need to go from plate to customer identity. The correct approach is to use the **customer-lookup-support** endpoint or search bookings broadly.

## Solution

Rewrite the Noddi API chain in `resolvePlate()` to use this strategy:

1. **Keep car lookup** -- get car_id from plate (already works)
2. **Replace the broken bookings-by-car call** with a broad bookings search using date range: `GET /v1/bookings/?start_date=...&end_date=...&brand_domains=noddi&page_size=100` -- scan results for matching `car_id` or `license_plate_number` in booking items/cars
3. When a matching booking is found, extract user info from `booking.user` or `booking.user_group`
4. **Add MCP fallback**: Use the Navio MCP server's `car_lookup` tool which may return richer data linking car to customer

### Alternative simpler approach
Since the `/v1/bookings/` list endpoint does work (used successfully in `list_route_bookings`), search recent bookings and match by plate in the response data.

## File Changes

| File | Change |
|---|---|
| `supabase/functions/bulk-outreach/index.ts` | Replace `?car_ids=X` call with a date-range bookings search that scans results for the plate, or use the car's `license_plate_number` to match against booking car data |

## Technical Detail

The bookings list endpoint **does** work -- the `list_route_bookings` action in the same file successfully calls `/v1/bookings/?start_date=...&end_date=...`. The fix is to query recent bookings (e.g. last 90 days + next 30 days) and scan results for the matching plate/car_id. Each booking contains `car`, `user`, and `user_group` data from which we can extract contact info.

