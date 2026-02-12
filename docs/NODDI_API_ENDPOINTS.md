# Noddi API Endpoint Reference

Complete reference for every Noddi API endpoint used in the chatbot booking flow. This document ensures we always call the correct endpoints with the correct parameters.

> **Base URL:** `https://api.noddi.co` (configurable via `NODDI_API_BASE` env var)  
> **Auth:** `Authorization: Token <NODDI_API_TOKEN>` header on all requests  
> **Related:** [Timeslot Fix Documentation](./NODDI_TIMESLOT_FIX.md)

---

## Booking Flow Overview

```
1. Phone Verification  →  Send SMS code, verify PIN
2. Customer Lookup     →  Find user by phone, get user_group_id
3. Address Selection   →  Autocomplete search, resolve to address_id
4. Car Lookup          →  License plate → car details + car_id
5. Service Selection   →  List categories, get available items + prices
6. Time Slot Selection →  Get date range, fetch delivery windows
7. Booking Creation    →  POST /v1/bookings/ with all collected data
```

---

## 1. Phone Verification

### Send SMS Code

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/v1/users/send-phone-number-verification/` |
| **Edge Function** | `widget-send-verification` |
| **Query Params** | `domain` (string, default `"noddi"`), `phone_number` (URL-encoded, e.g. `%2B4712345678`) |

> ⚠️ **Gotcha:** This is a GET request, not POST. Parameters go in query string, not body. The `+` in phone numbers must be URL-encoded as `%2B`.

### Verify PIN Code

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/v1/users/verify-phone-number/` |
| **Edge Function** | `widget-verify-phone` |
| **Body** | `{ "phone_number": "+4712345678", "code": "1234" }` |
| **Success Response** | `{ "token": "..." }` (token may be null for new users) |

---

## 2. Customer Lookup

### Find Customer by Phone/Email

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/v1/users/customer-lookup-support/` |
| **Edge Functions** | `widget-ai-chat`, `noddi-customer-lookup`, `noddi-booking-proxy` |
| **Query Params** | `phone` and/or `email` |
| **Response** | `{ "user": {...}, "user_groups": [{id, is_default_user_group, is_personal, name}] }` |

> ⚠️ **Gotcha:** Must use `/customer-lookup-support/` specifically. Other lookup endpoints return `403 Forbidden`.

**Key fields to extract:**
- `user.id` → `user_id` for bookings
- `user_groups[].id` → `user_group_id` (prefer `is_default_user_group`, then `is_personal`, then first)

### Fetch Bookings for Customer

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/v1/user-groups/{user_group_id}/bookings-for-customer/` |
| **Edge Functions** | `widget-ai-chat`, `noddi-customer-lookup` |
| **Query Params** | `page_size` (optional, default varies) |
| **Response** | `{ "results": [...] }` or direct array |

---

## 3. Address

### Autocomplete Address Search

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/v1/addresses/suggestions/` |
| **Edge Function** | `noddi-address-lookup` (action: `"suggestions"`) |
| **Query Params** | `query_input` (min 2 chars), `country_codes` (e.g. `"NO,SE"`) |
| **Response** | Array of suggestion objects (with `place_id` for Google Places) |

### Resolve Address from Google Place ID

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/v1/addresses/create-from-google-place-id/` |
| **Edge Function** | `noddi-address-lookup` (action: `"resolve"`) |
| **Body** | `{ "place_id": "ChIJ..." }` |
| **Response** | Address object with `id` (this is the `address_id` used everywhere) |

---

## 4. Car Lookup

### Lookup Car by License Plate

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/v1/cars/from-license-plate-number/` |
| **Edge Function** | `noddi-booking-proxy` (action: `"lookup_car"`) |
| **Query Params** | `brand_domains=noddi`, `country_code` (default `"NO"`), `number` (license plate) |
| **Response** | Car object with `id`, `make`, `model`, `license_plate_number` |

---

## 5. Services

### List Service Categories

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/v1/sales-item-booking-categories/for-new-booking/` |
| **Edge Function** | `noddi-booking-proxy` (action: `"list_services"`) |
| **Query Params** | `address_id` (required) |
| **Response** | Array of category objects with `type`, `name`, `description` |
| **Fallback** | Returns hardcoded services (Dekkskift, Bilvask, Dekkhotell) if endpoint fails or `address_id` missing |

### Get Available Items for Booking

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/v1/sales-items/initial-available-for-booking/` |
| **Edge Function** | `noddi-booking-proxy` (action: `"available_items"`) |
| **Body** | `{ "address_id": 123, "license_plates": [{"number": "AB12345", "country_code": "NO"}] }` |
| **Optional Body** | `sales_item_category_id`, `car_ids` (alternative to `license_plates`) |

> ⚠️ **Gotcha:** `license_plates` must be objects `{number, country_code}`, NOT plain strings. `car_ids` are plain integers.

---

## 6. Time Slots / Delivery Windows

### Earliest Available Date

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/v1/delivery-windows/earliest-date/` |
| **Edge Function** | `noddi-booking-proxy` (action: `"earliest_date"`) |
| **Body** | `{ "address_id": 123, "cars": [{"id": 456}] }` |

> ⚠️ **Gotcha:** Cars must be passed as `[{id: N}]` objects, NOT plain integers `[N]`.

### Latest Available Date

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/v1/delivery-windows/latest-date/` |
| **Edge Function** | `noddi-booking-proxy` (action: `"latest_date"`) |
| **Query Params** | `address_id` (optional) |

### Fetch Delivery Windows

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/v1/delivery-windows/for-new-booking/` |
| **Edge Function** | `noddi-booking-proxy` (action: `"delivery_windows"`) |
| **Query Params** | `address_id` (required), `from_date`, `to_date`, `selected_sales_item_ids` (repeatable) |
| **Response** | Array/object of delivery window objects |

> ⚠️ **CRITICAL Gotcha:** Delivery window objects use `pk` (NOT `id`) as their primary identifier. The frontend uses a fallback chain: `window.id || window.pk || window.delivery_window_id || window.delivery_window?.id`. See [NODDI_TIMESLOT_FIX.md](./NODDI_TIMESLOT_FIX.md) for full details.

---

## 7. Booking Management

### Create Booking

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/v1/bookings/` |
| **Edge Function** | `noddi-booking-proxy` (action: `"create_booking"`) |

**Required payload:**
```json
{
  "address_id": 123,
  "user_id": 456,
  "user_group_id": 789,
  "delivery_window": {
    "id": 42,
    "starts_at": "2026-02-16T08:00:00Z",
    "ends_at": "2026-02-16T11:00:00Z"
  },
  "cars": [
    {
      "license_plate": {
        "number": "AB12345",
        "country_code": "NO"
      },
      "selected_sales_item_ids": [1, 2]
    }
  ]
}
```

> ⚠️ **Gotchas:**
> - `delivery_window` is an object with `id`, `starts_at`, `ends_at` — not a flat `delivery_window_id`
> - `license_plate` is an object `{number, country_code}` — not a string
> - `selected_sales_item_ids` is an array of integers
> - All IDs (`user_id`, `user_group_id`, `delivery_window.id`) must be truthy integers — `0` and `undefined` are invalid

### Get Booking Details

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/v1/bookings/{booking_id}/` |
| **Edge Function** | `widget-ai-chat` |

### Reschedule Booking

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/v1/bookings/{booking_id}/reschedule/` |
| **Edge Function** | `widget-ai-chat` |
| **Body** | `{ "new_start_time": "2026-02-20T10:00:00Z" }` |

### Cancel Booking

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/v1/bookings/{booking_id}/cancel/` |
| **Edge Function** | `widget-ai-chat` |
| **Body** | `{ "cancellation_reason": "..." }` (optional) |

---

## 8. Supporting Endpoints

### Service Departments

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/v1/service-departments/from-booking-params/` |
| **Edge Function** | `noddi-booking-proxy` (action: `"service_departments"`) |
| **Query Params** | `address_id` (required), `sales_items_ids` (repeatable) |

---

## Edge Function → Endpoint Mapping

| Edge Function | Noddi Endpoints |
|---|---|
| `widget-send-verification` | `GET /v1/users/send-phone-number-verification/` |
| `widget-verify-phone` | `POST /v1/users/verify-phone-number/` |
| `widget-ai-chat` | `GET /v1/users/customer-lookup-support/`, `GET /v1/user-groups/{id}/bookings-for-customer/`, `GET /v1/bookings/{id}/`, `POST /v1/bookings/{id}/reschedule/`, `POST /v1/bookings/{id}/cancel/` |
| `noddi-address-lookup` | `GET /v1/addresses/suggestions/`, `POST /v1/addresses/create-from-google-place-id/` |
| `noddi-booking-proxy` | `GET /v1/cars/from-license-plate-number/`, `GET /v1/sales-item-booking-categories/for-new-booking/`, `POST /v1/sales-items/initial-available-for-booking/`, `POST /v1/delivery-windows/earliest-date/`, `GET /v1/delivery-windows/latest-date/`, `GET /v1/delivery-windows/for-new-booking/`, `GET /v1/service-departments/from-booking-params/`, `POST /v1/bookings/`, `GET /v1/users/customer-lookup-support/` |
| `noddi-customer-lookup` | `GET /v1/users/customer-lookup-support/`, `GET /v1/user-groups/{id}/bookings-for-customer/` |

---

## Known Gotchas & Pitfalls

| Issue | Details |
|---|---|
| **Delivery window ID field name** | API returns `pk`, not `id`. Use fallback chain: `id \|\| pk \|\| delivery_window_id \|\| delivery_window?.id` |
| **Cars in earliest-date** | Must be `[{id: N}]` objects, not `[N]` plain integers |
| **License plates** | Must be `{number, country_code}` objects, not strings |
| **Phone verification is GET** | `send-phone-number-verification` is GET with query params, not POST |
| **Phone encoding** | `+` must be URL-encoded as `%2B` in query strings |
| **Customer lookup endpoint** | Must use `/customer-lookup-support/` — other endpoints return 403 |
| **`0` is never valid** | No Noddi entity ID is ever `0` — treat as missing |
| **`undefined` in JSON** | `JSON.stringify` silently drops `undefined` values — always validate before serializing |
| **Paginated responses** | Some endpoints return `{results: [...]}`, others return direct arrays — handle both |
