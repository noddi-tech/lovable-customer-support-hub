
# Noddi Booking Flow: Dynamic Components + Edge Function Proxy

## Overview

This plan creates a complete, dynamic booking flow that the AI chatbot can guide users through. Every step is implemented as a **registered block component** (following the existing registry pattern), so all steps are editable in the Flow Builder and reusable across flows.

## Architecture

The booking flow requires 4 new interactive block components and 1 new edge function proxy. The AI will orchestrate these steps using the flow configuration, calling the appropriate tools and emitting the right markers.

```text
Address Search (exists) --> License Plate Input --> Service Selector --> Time Slot Picker --> Booking Confirmation
     [ADDRESS_SEARCH]       [LICENSE_PLATE]         [SERVICE_SELECT]    [TIME_SLOT]          [CONFIRM] (exists)
```

## New Components (4 new blocks)

### 1. License Plate Block (`LicensePlateBlock.tsx`)

- **Marker**: `[LICENSE_PLATE]` / `[/LICENSE_PLATE]`
- **Field type**: `license_plate`
- **UI**: Input field with country flag (NO/SE), formatted plate input, submit button
- **Behavior**: User enters plate number, component calls the `noddi-booking-proxy` edge function with action `lookup_car`, displays car info (make, model, year) on success
- **Returns to AI**: JSON with `{ car_id, make, model, year, license_plate }`
- **Preview**: Mini license plate input in Flow Builder

### 2. Service Select Block (`ServiceSelectBlock.tsx`)

- **Marker**: `[SERVICE_SELECT]` / `[/SERVICE_SELECT]`
- **Field type**: `service`
- **UI**: Grid/list of available service cards with icons, names, and descriptions. Clickable selection.
- **Behavior**: On mount, calls `noddi-booking-proxy` with action `list_services` to fetch available service types. User taps a service to select it.
- **Returns to AI**: JSON with `{ type_slug, service_name }`
- **Preview**: Mini service card grid in Flow Builder

### 3. Time Slot Block (`TimeSlotBlock.tsx`)

- **Marker**: `[TIME_SLOT]` / `[/TIME_SLOT]`
- **Field type**: `time_slot`
- **UI**: Date selector (scrollable date chips) + time slot grid showing available windows with time ranges and prices
- **Behavior**: On mount, calls `noddi-booking-proxy` with actions `earliest_date` and `delivery_windows` to get available slots. User selects a date then a time slot.
- **Data needed**: Receives `address_id` and `booking_proposal_slug` via the inner content (parsed from marker)
- **Returns to AI**: JSON with `{ delivery_window_id, date, start_time, end_time, price }`
- **Preview**: Mini calendar + time grid in Flow Builder

### 4. Booking Summary Block (`BookingSummaryBlock.tsx`)

- **Marker**: `[BOOKING_SUMMARY]` / `[/BOOKING_SUMMARY]`
- **Field type**: `booking_summary`
- **UI**: Summary card showing address, car, service, date/time, price. Confirm/Cancel buttons (similar to existing ConfirmBlock but with structured data display).
- **Behavior**: Displays the booking details parsed from the marker content. On "Confirm", calls `noddi-booking-proxy` with action `create_booking` to finalize. Shows success state with booking number.
- **Returns to AI**: JSON with `{ confirmed: true/false, booking_id?, booking_number? }`
- **Preview**: Mini summary card in Flow Builder

## New Edge Function: `noddi-booking-proxy`

A single edge function that proxies all booking-related Noddi API calls. This keeps the NODDI_API_TOKEN server-side and provides a clean interface.

**Actions supported:**

| Action | Noddi Endpoint | Method | Purpose |
|--------|---------------|--------|---------|
| `lookup_car` | `/v1/cars/data-from-license-plate-number/` | GET | Get car from plate |
| `list_services` | `/v1/booking-proposals/types/` | GET | List available service types |
| `create_proposal` | `/v1/booking-proposals/` | POST | Create booking proposal |
| `add_proposal_item` | `/v1/booking-proposal-items/` | POST | Add service item to proposal |
| `earliest_date` | `/v1/delivery-windows/earliest-date/` | POST | Get earliest available date |
| `delivery_windows` | `/v1/delivery-windows/for-new-booking/` | GET | Get available time slots |
| `create_booking` | `/v1/bookings/` | POST | Create the booking |
| `start_booking` | `/v1/bookings/:id/start/` | POST | Activate the booking |

**Config**: `verify_jwt = false` (same as `noddi-address-lookup`)

## Edge Function AI Tools (widget-ai-chat)

Add new OpenAI tools so the AI can orchestrate the booking flow server-side when needed:

| Tool | Purpose |
|------|---------|
| `lookup_car_by_plate` | Look up car details from license plate |
| `list_available_services` | Get available service types |
| `create_booking_proposal` | Create a proposal with address, car, service |
| `get_delivery_windows` | Get available time slots for a proposal |
| `finalize_booking` | Create and start the booking |

These tools call the same `noddi-booking-proxy` edge function internally.

## BLOCK_PROMPTS Updates (widget-ai-chat)

Add prompt instructions for each new field type so the AI knows which markers to emit:

```
license_plate -> [LICENSE_PLATE]
service -> [SERVICE_SELECT]  
time_slot -> [TIME_SLOT]address_id::proposal_slug[/TIME_SLOT]
booking_summary -> [BOOKING_SUMMARY]JSON data[/BOOKING_SUMMARY]
```

## Flow Builder Integration

All 4 new blocks register with `applicableFieldTypes`, so they automatically appear in the Data Collection node's "Fields to Collect" dropdown. An admin can build a booking flow like:

1. **Data Collection**: Address (field_type: `address`) -- already exists
2. **Decision**: Auto-evaluate "Do we deliver?" based on address result
3. **Data Collection**: License Plate (field_type: `license_plate`) -- NEW
4. **Data Collection**: Service Selection (field_type: `service`) -- NEW
5. **Data Collection**: Time Slot (field_type: `time_slot`) -- NEW
6. **Data Collection**: Booking Summary (field_type: `booking_summary`) -- NEW

All fully editable -- labels, instructions, and validation hints configurable in the editor.

## Files to Create

| File | Purpose |
|------|---------|
| `src/widget/components/blocks/LicensePlateBlock.tsx` | License plate input + car lookup component |
| `src/widget/components/blocks/ServiceSelectBlock.tsx` | Service type selector component |
| `src/widget/components/blocks/TimeSlotBlock.tsx` | Date + time slot picker component |
| `src/widget/components/blocks/BookingSummaryBlock.tsx` | Booking summary + confirm component |
| `supabase/functions/noddi-booking-proxy/index.ts` | Noddi booking API proxy |

## Files to Edit

| File | Change |
|------|--------|
| `src/widget/components/blocks/index.ts` | Import 4 new blocks |
| `src/widget/api.ts` | Add booking proxy API functions |
| `supabase/functions/widget-ai-chat/index.ts` | Add new tools + BLOCK_PROMPTS entries for new field types |
| `supabase/config.toml` | Add `noddi-booking-proxy` function config |

## Data Flow

The AI orchestrates data between steps using conversation context. Each block returns structured JSON that the AI receives as a user message. The AI then uses this data in subsequent tool calls:

1. Address block returns `{ address_id: 123, is_in_delivery_area: true }`
2. AI stores `address_id` in context
3. License plate block returns `{ car_id: 456, make: "Tesla", model: "Model 3" }`
4. AI calls `create_booking_proposal` tool with `address_id=123, car_id=456, type_slug="dekkskift"`
5. AI emits `[TIME_SLOT]` with the proposal slug
6. Time slot block returns `{ delivery_window_id: 789 }`
7. AI emits `[BOOKING_SUMMARY]` with all collected data
8. Summary block calls `create_booking` on confirm

## Key Design Decisions

- **Not hardcoded**: Every step is a registered block, selectable from the Flow Builder dropdown. Admins can reorder, remove, or add steps.
- **Single proxy**: One edge function handles all Noddi booking endpoints, keeping auth server-side.
- **AI-orchestrated**: The AI decides when to call tools vs. emit UI markers based on the flow configuration. The flow builder controls the sequence, the AI follows it.
- **Progressive data**: Each block builds on data from previous blocks. The AI carries context between steps.
