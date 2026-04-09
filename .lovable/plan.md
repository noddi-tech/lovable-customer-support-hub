

# Display New Customer Lookup API Fields in Support App

## What this does
Surfaces the newly available fields from the Customer Lookup API in the support app's customer panels: booking type, location type, unable-to-complete comments, customer feedback/ratings, and customer segments.

## Current state
- The API already returns `priority_booking` as a raw object — the new fields (`booking_type`, `location_type`, `comments_unable_to_complete_public`, `comments_unable_to_complete_internal`, `feedback`) are already on this object from the API, just not displayed
- `segments` is a new field on the user group objects — already in `all_user_groups` raw data, just not mapped or displayed
- The edge function passes `priority_booking` through as-is (`any` typed), so the new booking-level fields should already be present in the response — no edge function changes needed for those
- For `segments` on user groups: need to include them in the `allUserGroupsFormatted` mapping

## Changes

### 1. Edit: `supabase/functions/noddi-customer-lookup/index.ts`
- In both `allUserGroupsFormatted` mappings (lines ~1302 and ~1544), add `segments: g.segments || []` to pass through the new segments field
- In `ui_meta`, add new fields extracted from priority booking:
  - `booking_type`: `priority_booking.booking_type || null` (e.g. "normal", "wheel_storage_pickup")
  - `location_type`: `priority_booking.location_type || null` (e.g. "mobile", "stationary")
  - `comments_unable_to_complete_public`: from priority booking (customer-facing reason)
  - `comments_unable_to_complete_internal`: from priority booking (internal reason)
  - `feedback`: the full feedback object if present (ratings + comment)
- Also add these to the `buildResponse` function's ui_meta output
- Bump version to "noddi-edge-1.9"

### 2. Edit: `src/hooks/useNoddihKundeData.ts`
- Update the `NoddiLookupResponse` type to include:
  - `segments` on `all_user_groups` items
  - New `ui_meta` fields: `booking_type`, `location_type`, `comments_unable_to_complete_public`, `comments_unable_to_complete_internal`, `feedback`

### 3. Edit: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`
- **Booking type + location type badges**: Show next to booking title (e.g. "Mobile" badge in blue, "Stationary" in gray; "Wheel Storage Pickup" badge if not "normal")
- **Unable-to-complete comments**: When `unable_to_complete` is true, show the public and internal comments in the existing amber alert area (internal comment in a collapsible "Internal note" section)
- **Feedback section**: When `feedback` exists on the booking, show a new card below the booking info with:
  - Overall rating as stars (using the existing `StarRatingInput` component in read-only mode)
  - Individual ratings (car result, communication, ease of use, politeness) as small inline star displays
  - Customer comment in a quote block
- **Segments**: Show segment badges on the customer identity area (e.g. "VIP" in gold, "New Customer" in green, "Prospect" in blue, "Customer" in gray)

### 4. Edit: `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx`
- **Booking type + location type**: Show as compact badges in the priority booking section
- **Feedback**: Show overall rating as small stars inline when feedback exists
- **Segments**: Show as compact badges near the customer name
- **Unable-to-complete comments**: Show truncated public comment when present

## Technical details
- The `priority_booking` object is already passed through as `any` — the new fields are simply additional properties on it from the Noddi API, available now
- `segments` needs explicit mapping in the `allUserGroupsFormatted` blocks (2 places in the edge function)
- `StarRatingInput` already exists with `disabled` prop for read-only display; use `size="sm"` for compact display
- Format segment values for display: `new_customer` → "New Customer", `vip` → "VIP", etc.
- No database migrations needed

