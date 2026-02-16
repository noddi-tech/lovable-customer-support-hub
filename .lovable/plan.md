

# Comprehensive Fix: Booking Flow End-to-End

## Root Cause Analysis

After deep investigation, the fundamental problem is an **architectural mismatch** in how `executeLookupCustomer` fetches booking data:

1. It calls `/v1/users/customer-lookup-support/` -- this returns rich data including `user_groups[].bookings_summary.priority_booking` with car, service, address info
2. But then it IGNORES the bookings from that response and makes a SECOND call to `/v1/user-groups/{id}/bookings-for-customer/` -- a different endpoint that returns a sparse booking shape where `car`, `cars`, and `order_lines` are all **null**
3. All subsequent fixes have been trying to extract data from these empty fields

The inbox's `noddi-customer-lookup` function already handles this correctly -- it extracts `priority_booking` from `customer-lookup-support` and gets vehicle/service data from it. The widget should do the same.

## The Fix Strategy

Instead of making the second API call to `bookings-for-customer`, extract booking data from the `customer-lookup-support` response itself (specifically `user_groups[].bookings_summary`) and supplement with `unpaid_bookings`. This is the same data the inbox uses.

---

## All Issues and Their Fixes

### Issue 1: BOOKING_INFO missing car, service, address
**Current**: `executeLookupCustomer` calls `bookings-for-customer` which returns null for `car`/`cars`/`order_lines`
**Fix**: Use `bookings_summary.priority_booking` from `customer-lookup-support` response. Extract vehicle via same pattern as `extractVehicleLabel`, service via `extractServiceTitle`

### Issue 2: YES/NO buttons instead of BOOKING_EDIT after time selection
**Current**: After user selects a time slot, AI outputs a confirmation question instead of `[BOOKING_EDIT]`. `patchYesNo` catches it
**Fix**: Add `patchTimeSlotConfirmToEdit` post-processor that detects time slot selection + confirmation question and auto-injects `[BOOKING_EDIT]`. Also skip `patchYesNo` when last user message is a time slot selection

### Issue 3: BOOKING_CONFIRMED renders as plain text after update
**Current**: AI outputs text instead of marker. Context-based injection in `patchBookingConfirmed` can't find rich data because `update_booking` returns raw Noddi fields
**Fix**: Update `patchBookingConfirmed` to handle raw Noddi fields (`booking_items_car`, `service_categories`, `delivery_window_starts_at`)

### Issue 4: Redundant ACTION_MENU after BOOKING_CONFIRMED
**Current**: Post-processor pipeline runs `patchBookingConfirmed` -> `patchBookingInfo` -> `patchActionMenu`. After confirmation, all three fire
**Fix**: Skip `patchBookingInfo` and `patchActionMenu` if `[BOOKING_CONFIRMED]` is present

### Issue 5: Redundant text above BOOKING_EDIT
**Current**: AI outputs explanatory text before the component
**Fix**: Already partially fixed. Strengthen the regex patterns

### Issue 6: Timestamp normalization in update_booking
**Current**: Missing `Z` suffix causes 400 errors on first attempt
**Fix**: Normalize timestamps in `noddi-booking-proxy` before sending PATCH

---

## Technical Details

### File 1: `supabase/functions/widget-ai-chat/index.ts`

**Change A -- Rewrite `executeLookupCustomer` booking extraction (lines 969-1124)**

Replace the `bookings-for-customer` API call with extraction from the `customer-lookup-support` response:

```text
// Instead of:
const bResp = await fetch(`${API_BASE}/v1/user-groups/${userGroupId}/bookings-for-customer/`, ...);

// Do:
// 1. Extract priority_booking from user_groups[].bookings_summary
// 2. Use lookupData.unpaid_bookings for additional bookings
// 3. Combine into a unified booking list
```

For each booking, extract:
- `address`: from `b.address` object (construct string from parts)
- `vehicle`: from `b.car` object (make + model + license_plate), or from `booking_items_car[0].car`
- `services`: from `b.order?.lines`, `b.service_categories`, or `booking_items_car[].sales_items`
- `storedCars`: from `b.car` and `booking_items_car[].car`
- `storedAddresses`: from `b.address`

The key difference is that `priority_booking` from `bookings_summary` has fields like:
- `car.make`, `car.model`, `car.registration` (or `license_plate`)
- `service.name` or `order.lines[].name`
- `address.street_name`, `address.street_number`, etc.

**Change B -- Fix `patchBookingInfo` to handle raw Noddi fields (lines 530-578)**

Add handling for:
- `booking_items_car[0].car` for vehicle
- `service_categories[0].name` for service
- `delivery_window_starts_at`/`ends_at` for time
- `address` as raw object (construct string)
- Skip entirely if `[BOOKING_CONFIRMED]` is present

**Change C -- Fix `patchActionMenu` to skip when BOOKING_CONFIRMED present (line 618)**

Add: `if (reply.includes('[BOOKING_CONFIRMED]')) return reply;`

**Change D -- Add `patchTimeSlotConfirmToEdit` post-processor (new function)**

Detects when:
1. User's last message is a time slot selection (JSON with `delivery_window_id`)
2. AI outputs a confirmation question instead of `[BOOKING_EDIT]`

Auto-injects `[BOOKING_EDIT]` with booking context from tool results.

**Change E -- Update `patchYesNo` to skip after time slot selection (line 405)**

Add check: if last user message is JSON with `delivery_window_id`, skip `patchYesNo`.

**Change F -- Update `patchBookingConfirmed` for raw Noddi fields (lines 726-787)**

Add fallbacks for `booking_items_car`, `service_categories`, `delivery_window_starts_at/ends_at` in both marker-based and context-based injection paths.

**Change G -- Update post-processor pipeline order (lines 1909-1919)**

Add `patchTimeSlotConfirmToEdit` before `patchBookingEdit` in the pipeline.

### File 2: `supabase/functions/noddi-booking-proxy/index.ts`

**Change H -- Normalize ISO timestamps in update_booking**

Before sending PATCH, ensure `starts_at` and `ends_at` have `Z` suffix.

---

## Expected End-to-End Flow After Fix

1. Customer verifies phone -> AI calls `lookup_customer`
2. `lookup_customer` uses data from `customer-lookup-support` directly (no second API call)
3. `[BOOKING_INFO]` shows all fields: address, date, time, car, service
4. `[ACTION_MENU]` shows options as clickable pills
5. Customer selects "Endre tid" -> `[TIME_SLOT]` component
6. Customer selects time -> `[BOOKING_EDIT]` component (not YES/NO) with diff view
7. Customer confirms -> `update_booking` succeeds (normalized timestamps)
8. `[BOOKING_CONFIRMED]` card shown (not plain text)
9. No redundant `[BOOKING_INFO]` or `[ACTION_MENU]` after confirmation

