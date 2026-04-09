

# Fix Duplicate Badges and Oldest Booking Display

## Problems

### 1. Duplicate segment badges
The `segments` array on each user group contains one entry per `service_department_id`. A customer in 6 service departments gets 6 segment entries (e.g., "Customer" x2, "Prospect" x4). The UI renders all of them without deduplication.

### 2. Showing oldest booking instead of most recent
In the edge function's fallback path (`fetchUserGroupBookings`), bookings are fetched from `/v1/user-groups/{id}/bookings-for-customer/` without any ordering parameter. The API likely returns oldest-first by default, and the code takes `recentBookings[0]` (the oldest). Additionally, the Noddi API's `bookings_summary.priority_booking` may itself return the oldest booking.

## Changes

### 1. `src/components/dashboard/voice/NoddiCustomerDetails.tsx`
- **Deduplicate segments**: Before rendering segment badges (line ~346), deduplicate by unique `segment` value. Use `[...new Map(segments.map(s => [s.segment, s])).values()]` to keep only one badge per segment type.

### 2. `supabase/functions/noddi-customer-lookup/index.ts`
- **Sort fetched bookings by date descending**: In `fetchUserGroupBookings` (~line 120), after fetching bookings, sort them by `completed_at` or `delivery_window_starts_at` descending so the newest booking comes first.
- **Add ordering parameter to API call**: Append `&ordering=-id` (or `-completed_at`) to the API URL to request newest-first from the Noddi API directly.
- Deploy the updated edge function.

### 3. `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx`
- Apply the same segment deduplication as the desktop component.

## Technical details
- Segment deduplication is purely a UI concern: `Array.from(new Map(segments.map(s => [s.segment, s])).values())`
- For booking ordering, the Noddi bookings-for-customer endpoint likely supports `-id` or `-completed_at` ordering. Adding a client-side sort as a fallback ensures correctness regardless of API behavior.
- No database changes needed.

