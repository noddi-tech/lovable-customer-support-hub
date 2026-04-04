
Goal

Fix the real blocker: bulk outreach plate lookup is running, but the resolver is using the wrong primary data source, so all 11 plates end up as “not found”.

What I confirmed

- The screen is rendering now; the screenshot shows the Bulk Outreach UI loaded correctly.
- The current failure is in `supabase/functions/bulk-outreach/index.ts`.
- Edge logs show the same pattern for the failed plates:
  - car lookup succeeds
  - returned car has `user_group=null`, `car_managers=0`, `owners_current=0`
  - function exits with `no_user_on_car`
- So the previous fix only solved the case where a car already has a `user_group`. Your failing plates do not.

Definitive root cause

The resolver assumes this chain:

`plate -> car -> user_group/user -> email`

But for the failing cars, the API only returns vehicle metadata, not customer ownership/contact linkage.

The attached `internal.json` shows the useful customer data lives on booking endpoints, not reliably on the car lookup response:
- `GET /v1/user-groups/{id}/bookings-for-customer/` is valid only after you already have a `user_group_id`
- booking search supports license-plate-based discovery through booking data
- booking endpoints use `from_date` / `to_date` style filters, not the current `start_date` / `end_date`

Implementation plan

1. Rework `resolvePlate()` to use booking lookup as the main fallback
   - Keep local cache lookup first
   - Keep direct car lookup second, but only as a way to get `car_id` / plate normalization
   - If the car response has no `user_group` and no direct user, search bookings by plate instead of stopping

2. Add booking-based plate resolution in `supabase/functions/bulk-outreach/index.ts`
   - Query a booking endpoint that supports searching by license plate
   - Prefer the most recent relevant booking
   - Extract contact data from `booking.user`
   - If only `user_group_id` is available, then call `bookings-for-customer` for richer user details
   - Use the same car-parsing patterns already used elsewhere in the codebase (`car`, `cars`, `booking_items_car`, `booking_items`)

3. Fix the route/date lookup parameters
   - Update `list_route_bookings` to use the documented booking query params from the API spec
   - Replace undocumented `start_date` / `end_date` usage with the correct documented date filters

4. Make failures visible instead of opaque
   - Extend the edge-function result with fields like:
     - `reason`
     - `source`
     - `debug_path`
   - Update the recipient review UI to show why a plate failed:
     - no car found
     - car found, no linked booking
     - booking found, no email
     - cache hit
   - This prevents future “0 matches” from being a black box

5. Add focused tests for the resolver paths
   - Cache hit
   - Car with direct user
   - Car with `user_group`
   - Car with no `user_group`, but booking search succeeds
   - Car exists, but no contactable booking/user exists

Files to update

- `supabase/functions/bulk-outreach/index.ts`
- `src/components/bulk-outreach/RecipientReview.tsx`
- `src/pages/BulkOutreach.tsx` or shared recipient typing if needed

Technical notes

```text
Current failing path:
plate -> car lookup -> user_group is null -> stop -> matched=false

Planned path:
plate -> cache
      -> car lookup
      -> if no user/user_group:
           booking search by plate
           -> extract booking.user email/phone/name
           -> optional bookings-for-customer enrich
```

Expected result

- The 11 plates should no longer depend on `car.user_group` being present.
- Plates with booking history should resolve to real contacts.
- If a plate still fails, the UI will clearly show why.

Most important change

Do not treat `car.user_group` as required. For your failing plates, that field is null. The resolver must pivot to booking search by plate before declaring “not found”.
