
Why this is happening

1. The plate lookup is failing for two code reasons:
   - In `src/pages/BulkOutreach.tsx`, `resolve_plates` is called without `organization_id`, so the edge function cannot use any org-scoped local fallback.
   - In `supabase/functions/bulk-outreach/index.ts`, the fallback is effectively broken anyway: it searches `customers.metadata->>license_plate` / `plate`, but this codebase mainly stores Noddi IDs in customer metadata, not plate values. The current `.or(...,phone.not.is.null)` can also produce bad fallback candidates.

2. The Noddi lookup chain is too optimistic:
   - `resolvePlate()` assumes `/v1/bookings/?car_ids=...` will reliably return a booking shape with `user_group` / `user_group_id`.
   - Your logs show the function repeatedly reaching `No user group found via bookings`, so that query is either returning no usable rows or the response shape is different than expected.

3. Most console errors are noise, not the cause of “found 0 matches”:
   - `RS SDK - TikTok Ads` / `Google Ads` warnings: analytics/instrumentation noise.
   - WebSocket `wss://...lovableproject.com` / `localhost:8080` failures: preview/HMR websocket issues.
   - `manifest.json 401`: preview asset issue.
   - `Function components cannot be given refs`: a separate React warning around `TableHeaderCell`, not the bulk-outreach root cause.

Plan

1. Fix the frontend request payload
   - Update `BulkOutreach.tsx` to use `organizationId` from `useAuth()` and pass it in `resolve_plates`, `list_route_bookings`, and `send_bulk`.
   - Add a guard so lookup cannot run before organization context is available.

2. Replace the broken local fallback
   - Remove the current `customers.metadata->>license_plate / plate` fallback logic.
   - Rebuild fallback to use data that actually exists in this project:
     - `noddi_customer_cache.cached_priority_booking`
     - `noddi_customer_cache.cached_pending_bookings`
     - `noddi_customer_cache.cached_customer_data`
   - Reuse the existing booking/car field patterns already handled elsewhere in the codebase (`car`, `cars`, `booking_items_car`, `booking_items`) to match a plate against cached bookings.

3. Make the Noddi booking lookup more robust
   - Keep the initial car lookup by plate.
   - After that, improve booking resolution so it does not rely on only `booking.user_group?.id || booking.user_group_id`.
   - Inspect alternate booking shapes and, if needed, fetch booking detail for candidate bookings before concluding “not found”.
   - Add clearer logs for:
     - no car found
     - no bookings returned
     - bookings returned but no user group
     - user group found but no email

4. Tighten match rules
   - Only mark a recipient as matched when there is a real contact path for outreach.
   - Remove the broad `phone.not.is.null` fallback behavior to avoid false positives.

5. Clean up the unrelated console warning
   - Refactor `TableHeaderCell` to a `forwardRef`-compatible pattern or wrap the sortable button inside `TableHead`.
   - This should reduce the repeated `Function components cannot be given refs` warning in conversation tables.

Technical details

- Files to update:
  - `src/pages/BulkOutreach.tsx`
  - `supabase/functions/bulk-outreach/index.ts`
  - likely `src/components/dashboard/conversation-list/TableHeaderCell.tsx`

- No schema change is required for the lookup fix if we use `noddi_customer_cache`.
- No new secrets should be needed.
- Expected result after implementation:
  - plate lookups use the current organization
  - cached Noddi booking data can rescue matches when the direct booking query is incomplete
  - “found 0 matches” should only happen when there truly are no mappable customer records

Verification

1. Test plate lookup again with the same 11 plates.
2. Confirm at least some rows move from `Not found` to `Matched`.
3. Check bulk-outreach logs for the new structured reason codes.
4. Confirm the `TableHeaderCell` ref warning is reduced or removed.
