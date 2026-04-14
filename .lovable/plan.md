

# Integrate Noddi Customer Lookup API v2 Changes

## Summary
Anders' API update introduces a new endpoint (`/user-customer-lookup-summary/`), server-side caching with `clear_cache` param, new fields on unpaid/priority bookings (address, comments, slug, booking_location_type), saved addresses on user groups, and a new **Tire Quotes** section per user group. We need to update the edge function to use the new endpoint and pass through the new data, then update the UI to display the new fields.

## Changes

### 1. Edge Function: Switch to new endpoint + pass new fields
**File: `supabase/functions/noddi-customer-lookup/index.ts`**

- Replace API URL from `/v1/users/customer-lookup-support/` to `/v1/users/user-customer-lookup-summary/`
- On `forceRefresh`, append `?clear_cache=true` query param to the Noddi API call (this clears server-side cache, making refresh fast)
- Pass through new booking fields in `buildResponse` and `mapCacheRowToUnified`:
  - `booking_location_type` (replaces `location_type` on priority bookings)
  - `address` (street/zip/city) on priority + unpaid bookings
  - `comments` object (`admin`, `user`, `worker`) on both booking types
  - `slug` on unpaid bookings
  - `booking_type` on unpaid bookings
  - `brand_name` on unpaid bookings
- Pass through new user group fields:
  - `addresses` (saved addresses list) on `allUserGroupsFormatted`
  - `tire_quotes` array on each user group
- Update `ui_meta.location_type` → read from `booking_location_type` (with fallback to `location_type` for backward compat)
- Bump version to `noddi-edge-2.0`

### 2. UI: Display new fields in NoddiCustomerDetails
**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`**

- **Booking address**: Show street/zip/city under booking details (next to date/service/vehicle)
- **Comments**: Show `comments.user` and `comments.admin` in the booking card (replace inline `comments_unable_to_complete_*` with the new `comments` object, with fallback)
- **Unpaid bookings**: Expand the unpaid section to show per-booking details (address, slug link, brand, booking_type) instead of just a count
- **Booking location type**: Update badge to read `booking_location_type` field (with `location_type` fallback)
- **Saved addresses**: Show user group saved addresses in a collapsible section
- **Tire Quotes**: New collapsible section showing tire quotes with car info, season, status, payment, and status history timeline

### 3. UI: Update refresh button to leverage server-side cache clear
**File: `src/hooks/useNoddihKundeData.ts`**
- Already passes `forceRefresh: true` on refresh — just ensure the edge function forwards it as `clear_cache=true` to the API

### Files to modify
- `supabase/functions/noddi-customer-lookup/index.ts` — new endpoint URL, `clear_cache` param, pass through new fields
- `src/components/dashboard/voice/NoddiCustomerDetails.tsx` — display address, comments, expanded unpaid list, saved addresses, tire quotes
- `src/hooks/useNoddihKundeData.ts` — minor: add `tire_quotes` and `addresses` to response type (if typed)

