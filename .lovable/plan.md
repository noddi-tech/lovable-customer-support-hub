
## What I found

- The live `bulk-outreach` function is still failing on the current strategy: logs show `Car found ...` followed by `Bookings broad search failed: HTTP 400` for each plate.
- The local fallback is too sparse to rescue this:
  - `noddi_customer_cache` has only 4 rows for this org
  - `customers` has no plate/car columns
  - only a small subset of customers has `metadata.noddi_user_id`, and none currently have `metadata.user_group_id`
- So the usable plate ↔ customer relationship is not stored in a normalized local table. It mainly exists inside Noddi payloads and cache JSON blobs.
- The simplest path is exactly what you suggested: match through the car first, then resolve the user, instead of scanning broad bookings.

## Updated plan

1. Replace the current reverse-bookings logic in `supabase/functions/bulk-outreach/index.ts`
   - Remove the broad `/v1/bookings/?start_date=...&end_date=...` lookup from `resolvePlate()`.
   - Keep plate → car lookup as step 1.
   - Immediately inspect the car response for direct identity fields (`user`, `user_id`, `user_group`, `email`, `phone`, similar owner fields).

2. Switch the resolver to a car → user flow
   - New preferred order:
     1. plate → car
     2. derive user/contact from car payload if present
     3. resolve the customer via existing Noddi customer lookup patterns
     4. verify that customer against bookings/stored cars for that user
   - This is much safer than scanning unrelated bookings and hoping the plate appears in a paginated global result.

3. Strengthen cache matching around car + user
   - Update `lookupFromCache()` to match by both normalized plate and `car.id/car_id`.
   - Search all known car shapes already used elsewhere in the codebase:
     - `car`
     - `cars`
     - `booking_items_car`
     - `booking_items`
   - Extract name/email/phone from `cached_customer_data` first, then fallback to row-level `email` / `phone`.

4. Reuse the existing Noddi normalization patterns
   - Reuse the same plate/car extraction logic already used in shared Noddi helpers so bulk outreach stops drifting from the rest of the integration.
   - If cleaner, pull a tiny shared helper instead of keeping yet another copy of plate/car parsing.

5. Keep the frontend payload safe
   - Update `src/pages/BulkOutreach.tsx` so the plate lookup callback depends on `organizationId` instead of using an empty dependency array.
   - Keep passing `organization_id` in all edge function calls.

6. Fix the current build blocker in the same pass
   - The actual type-check failure is currently localized to `supabase/functions/extract-customer-memories/index.ts`:
     - type the `find_similar_memory` RPC result so `similar.id` and `similar.confidence` are valid
     - widen the sentiment score array to `number[]` (or use a typed numeric reducer) so the `reduce` call passes
   - No need to treat the whole long checklist as separate work if these 3 errors are the active blockers.

## Files to update

- `supabase/functions/bulk-outreach/index.ts`
- possibly `supabase/functions/_shared/chat-utils.ts` and/or `_shared/noddi-tools.ts`
- `src/pages/BulkOutreach.tsx`
- `supabase/functions/extract-customer-memories/index.ts`

## Technical details

```text
New matching flow

plate
  -> lookup car
  -> if car contains user/contact info:
       resolve customer directly
       verify that user's bookings / stored cars
  -> else try local cache by car_id / plate
  -> else return not matched
```

Important context behind this plan:
- The current global bookings strategy is still returning HTTP 400 in production logs
- Local Supabase does not currently expose a dedicated plate/customer table
- The relationship you are referring to is most likely available through Noddi car/user data and cached booking payloads, which is why the resolver should be built around car → user instead of plate → broad bookings

No schema change is required for this fix.

## Verification

1. Retry the same 11 plates in `/operations/bulk-outreach`.
2. Confirm logs no longer show `Bookings broad search failed: HTTP 400`.
3. Confirm at least some rows resolve to real name/email values through car → user matching.
4. Re-run build/typecheck and confirm the 3 `extract-customer-memories` errors are gone.
