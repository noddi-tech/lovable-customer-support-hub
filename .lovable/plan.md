

# Update Noddi Booking Proxy to Match Real API Endpoints

## Problem

The `noddi-booking-proxy` edge function uses incorrect/outdated Noddi API endpoints. The user captured the actual endpoints from the Noddi website's booking flow, revealing significant differences in how the API works.

## Current vs Real API Mapping

| Step | Current Proxy | Real Noddi API |
|------|--------------|----------------|
| Car lookup | `/v1/cars/data-from-license-plate-number/?country_code=X&license_plate_number=X` | `/v1/cars/from-license-plate-number/?brand_domains=noddi&country_code=NO&number=X` |
| List services | `/v1/booking-proposals/types/` (404!) | `/v1/sales-item-booking-categories/for-new-booking/?address_id=X` (requires address_id) |
| Available items | N/A | `/v1/sales-items/initial-available-for-booking/` (POST) |
| Earliest date | `/v1/delivery-windows/earliest-date/` (POST) | Same (correct) |
| Latest date | N/A | `/v1/delivery-windows/latest-date/` (GET) |
| Delivery windows | `/v1/delivery-windows/for-new-booking/?address_id=X` | `/v1/delivery-windows/for-new-booking/?address_id=X&from_date=X&selected_sales_item_ids=X&to_date=X` |
| Create booking | `/v1/bookings/` (POST) | `/v1/bookings/shopping-cart-for-new-booking/` (POST) |
| Service depts | N/A | `/v1/service-departments/from-booking-params/?address_id=X&sales_items_ids=X` |
| Proposal system | `/v1/booking-proposals/` + `/v1/booking-proposal-items/` | Not used in real flow |

## Key Discoveries

1. **Services require address_id** -- you can't list services without an address first
2. **No proposal system** -- the real flow uses a "shopping cart" model, not proposals
3. **Car lookup URL is different** -- uses `number=` param and `brand_domains=noddi`
4. **Delivery windows need sales_item_ids** -- must pass selected service items
5. **New endpoints needed** -- `initial-available-for-booking`, `latest-date`, `service-departments`

## Changes

### 1. `supabase/functions/noddi-booking-proxy/index.ts`

Refactor all actions to match the real API:

- **`lookup_car`**: Update URL to `/v1/cars/from-license-plate-number/?brand_domains=noddi&country_code=X&number=X`
- **`list_services`**: Change to call `/v1/sales-item-booking-categories/for-new-booking/?address_id=X` (now requires `address_id` param)
- **`available_items`** (new): Add action for `POST /v1/sales-items/initial-available-for-booking/`
- **`delivery_windows`**: Add `selected_sales_item_ids` and `to_date` query params
- **`create_booking`**: Change endpoint to `/v1/bookings/shopping-cart-for-new-booking/`
- **Remove**: `create_proposal`, `add_proposal_item`, `start_booking` (not part of real flow)
- **Add**: `service_departments` action for `/v1/service-departments/from-booking-params/`
- **Add**: `latest_date` action for `/v1/delivery-windows/latest-date/`

### 2. `supabase/functions/widget-ai-chat/index.ts`

Update AI tool definitions to match the new proxy actions:

- **`list_available_services`**: Add required `address_id` parameter to the tool definition
- **`create_booking_proposal`**: Replace with a new `create_shopping_cart` tool that calls the shopping cart endpoint
- **`get_delivery_windows`**: Add `selected_sales_item_ids` and `to_date` params
- **`finalize_booking`**: Update to use the shopping cart endpoint
- **Tool execution mapping** (~line 988-999): Update the `case` statements to pass correct params to the updated proxy actions
- **Remove** references to proposal-based flow in system prompts

### 3. `src/widget/components/blocks/BookingSummaryBlock.tsx`

Update the confirm handler to use the new shopping cart endpoint instead of `create_booking` + `start_booking`.

## Technical Details

### New proxy action signatures:

```text
list_services:      { action: "list_services", address_id: number }
available_items:    { action: "available_items", address_id: number, car_ids: number[], sales_item_category_id: number }
delivery_windows:   { action: "delivery_windows", address_id: number, from_date: string, to_date: string, selected_sales_item_ids: number[] }
create_booking:     { action: "create_booking", ...shopping_cart_payload }
lookup_car:         { action: "lookup_car", country_code: string, license_plate: string }
earliest_date:      { action: "earliest_date", address_id: number }
latest_date:        { action: "latest_date", address_id: number }
service_departments:{ action: "service_departments", address_id: number, sales_items_ids: number[] }
```

