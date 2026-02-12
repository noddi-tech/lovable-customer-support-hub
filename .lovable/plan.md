

# Document All Noddi API Endpoints for the Booking Flow

Create a comprehensive reference document (`docs/NODDI_API_ENDPOINTS.md`) that maps out every Noddi API endpoint used across the entire chatbot booking flow, including which edge function calls it, what it expects, and what it returns.

## What the document will cover

### 1. Booking Flow Overview
A step-by-step summary of the complete booking journey:
Phone verification -> Customer lookup -> Address selection -> License plate/car lookup -> Service selection -> Time slot selection -> Booking confirmation

### 2. Every Noddi API Endpoint, organized by flow step

**Phone Verification (2 endpoints)**
- `GET /v1/users/send-phone-number-verification/` -- sends SMS code
- `POST /v1/users/verify-phone-number/` -- verifies PIN code

**Customer Lookup (2 endpoints)**
- `GET /v1/users/customer-lookup-support/` -- finds user by phone/email, returns user + user_groups
- `GET /v1/user-groups/{id}/bookings-for-customer/` -- fetches bookings for a user group

**Address (2 endpoints)**
- `GET /v1/addresses/suggestions/` -- autocomplete address search
- `POST /v1/addresses/create-from-google-place-id/` -- resolves a Google Place ID to a Noddi address with `address_id`

**Car Lookup (1 endpoint)**
- `GET /v1/cars/from-license-plate-number/` -- returns car details including car `id`

**Services (2 endpoints)**
- `GET /v1/sales-item-booking-categories/for-new-booking/` -- lists service categories for an address
- `POST /v1/sales-items/initial-available-for-booking/` -- returns specific bookable items with prices

**Time Slots (3 endpoints)**
- `POST /v1/delivery-windows/earliest-date/` -- earliest available date
- `GET /v1/delivery-windows/latest-date/` -- latest available date
- `GET /v1/delivery-windows/for-new-booking/` -- available delivery windows (the one with the `pk` field fix)

**Supporting (1 endpoint)**
- `GET /v1/service-departments/from-booking-params/` -- service department info

**Booking Management (3 endpoints)**
- `POST /v1/bookings/` -- create a new booking
- `GET /v1/bookings/{id}/` -- get booking details
- `POST /v1/bookings/{id}/reschedule/` -- reschedule a booking
- `POST /v1/bookings/{id}/cancel/` -- cancel a booking

### 3. For each endpoint, document:
- Noddi API URL and HTTP method
- Which edge function calls it
- Required parameters and their types
- Known field name quirks (e.g., `pk` vs `id` on delivery windows)
- Fallback behavior if the endpoint fails
- Example request/response shapes

### 4. Edge Function to Endpoint Mapping
A quick-reference table showing which edge function calls which Noddi endpoints:

| Edge Function | Noddi Endpoints Called |
|---|---|
| `widget-send-verification` | send-phone-number-verification |
| `widget-verify-phone` | verify-phone-number |
| `widget-ai-chat` | customer-lookup-support, user-groups/{id}/bookings-for-customer, bookings/{id}, bookings/{id}/reschedule, bookings/{id}/cancel |
| `noddi-address-lookup` | addresses/suggestions, addresses/create-from-google-place-id |
| `noddi-booking-proxy` | cars/from-license-plate-number, sales-item-booking-categories, sales-items/initial-available-for-booking, delivery-windows/earliest-date, delivery-windows/latest-date, delivery-windows/for-new-booking, service-departments/from-booking-params, bookings/ |
| `noddi-customer-lookup` | customer-lookup-support, user-groups/{id}/bookings-for-customer |

### 5. Known Gotchas Section
- Delivery window objects use `pk` not `id`
- Cars must be passed as `[{id: N}]` not `[N]`
- License plates must be objects `{number, country_code}` not strings
- `0` is never a valid ID for any field
- `JSON.stringify` silently drops `undefined` values

## Technical details
- Single new file: `docs/NODDI_API_ENDPOINTS.md`
- No code changes required
- References existing fix documentation in `docs/NODDI_TIMESLOT_FIX.md`

