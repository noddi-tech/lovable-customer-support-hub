
# Fix: "Change Booking Time" Flow -- Missing IDs Prevent TIME_SLOT Marker

## Root Cause

The "change_time" flow requires the AI to emit a `[TIME_SLOT]` marker with `address_id`, `car_ids`, `license_plate`, and `sales_item_id`. However, **neither tool returns these IDs**:

1. **`lookup_customer`** returns bookings with only display strings:
   - `address: "Holtet 45, 1368 Oslo"` (no `address_id`)
   - `vehicle: "Tesla Model Y (EC94156)"` (no `car_id`)
   - `services: ["Dekkskift"]` (no `sales_item_ids`)

2. **`get_booking_details`** has the same problem:
   - `address: booking.address?.full_address` (no `address_id`)
   - `vehicle: { make, model, licensePlate }` (no `car_id`)
   - `services: [{ name, price }]` (no `sales_item_ids`)

Without these numeric IDs, the AI literally **cannot** construct the TIME_SLOT marker payload. It hits maxIterations trying tool calls that never give it the data it needs, then falls back to the Norwegian "please rephrase" message.

## Fix

### 1. `supabase/functions/widget-ai-chat/index.ts` -- `lookup_customer` bookings mapping (lines 526-533)

Add `address_id`, `car_id`, `car_ids`, and `sales_item_ids` to each booking object:

```typescript
bookings: bookings.slice(0, 10).map((b: any) => ({
  id: b.id,
  status: b.status,
  scheduledAt: b.start_time || b.scheduled_at || b.delivery_window_starts_at,
  services: b.order_lines?.map((ol: any) => ol.service_name || ol.name).filter(Boolean) || [],
  sales_item_ids: b.order_lines?.map((ol: any) => ol.sales_item_id || ol.id).filter(Boolean) || [],
  address: b.address?.full_address || b.address || null,
  address_id: b.address?.id || null,
  vehicle: b.car ? `${b.car.make || ''} ${b.car.model || ''} (${b.car.license_plate || ''})`.trim() : null,
  car_id: b.car?.id || null,
  car_ids: Array.isArray(b.cars) ? b.cars.map((c: any) => c.id).filter(Boolean) : (b.car?.id ? [b.car.id] : []),
  license_plate: b.car?.license_plate_number || b.car?.license_plate || (Array.isArray(b.cars) && b.cars[0] ? (b.cars[0].license_plate_number || b.cars[0].license_plate || '') : ''),
})),
```

### 2. `supabase/functions/widget-ai-chat/index.ts` -- `executeGetBookingDetails` (lines 554-565)

Add the same IDs to the booking details response:

```typescript
return JSON.stringify({
  id: booking.id,
  status: booking.status,
  scheduledAt: booking.start_time || booking.scheduled_at,
  endTime: booking.end_time,
  services: booking.order_lines?.map((ol: any) => ({ name: ol.service_name || ol.name, price: ol.price })) || [],
  sales_item_ids: booking.order_lines?.map((ol: any) => ol.sales_item_id || ol.id).filter(Boolean) || [],
  address: booking.address?.full_address || booking.address || null,
  address_id: booking.address?.id || null,
  vehicle: booking.car ? { make: booking.car.make, model: booking.car.model, licensePlate: booking.car.license_plate, year: booking.car.year } : null,
  car_id: booking.car?.id || null,
  car_ids: Array.isArray(booking.cars) ? booking.cars.map((c: any) => c.id).filter(Boolean) : (booking.car?.id ? [booking.car.id] : []),
  license_plate: booking.car?.license_plate_number || booking.car?.license_plate || '',
  totalPrice: booking.total_price,
  notes: booking.customer_notes || null,
});
```

### 3. Update `change_time` flow step instruction in database

The step 1 instruction should tell the AI to use `lookup_customer` (which returns bookings with IDs) rather than separately calling `get_booking_details`. If there's only one future booking, proceed directly; if multiple, ask the customer which one.

```sql
UPDATE ai_action_flows
SET flow_steps = '[
  {"id":"step_1","type":"lookup","field":"booking","instruction":"Use lookup_customer with the verified phone. The response includes future bookings with address_id, car_ids, sales_item_ids, and license_plate. If only one upcoming booking exists, confirm it is the one they want to change. If multiple, ask which one. Extract the address_id, car_ids, sales_item_ids, and license_plate from the chosen booking for the next step."},
  {"id":"step_2","type":"collect","field":"time_slot","marker":"TIME_SLOT","instruction":"Emit the [TIME_SLOT] marker using the address_id, car_ids, license_plate, and first sales_item_id from the booking identified in step 1. Do NOT call get_delivery_windows. The component fetches and displays available times automatically."},
  {"id":"step_3","type":"confirm","field":"edit","marker":"BOOKING_EDIT","instruction":"Show the [BOOKING_EDIT] marker with the booking_id, the old time from the booking details, and the new time selected by the customer."}
]'::jsonb
WHERE intent_key = 'change_time';
```

## Summary

| File / Target | Change |
|---|---|
| Edge function -- `lookup_customer` | Add `address_id`, `car_id`, `car_ids`, `sales_item_ids`, `license_plate` to each booking |
| Edge function -- `executeGetBookingDetails` | Add same IDs to response |
| Database -- `ai_action_flows` (change_time) | Update step instructions to reference available IDs and guide the AI through the flow |

## Why This Fixes It

The AI currently loops calling tools trying to find the IDs it needs, exhausts 8 iterations, and falls back. With IDs included in the tool responses, the flow becomes:

1. `lookup_customer` returns bookings **with IDs** (1 iteration)
2. AI asks "is this the booking you want to change?" (0 iterations, text response)
3. Customer confirms, AI emits `[TIME_SLOT]{"address_id": 2860, "car_ids": [555], "license_plate": "EC94156", "sales_item_id": 60282}` (0 iterations, text response)
4. Customer picks a time, AI emits `[BOOKING_EDIT]` (0 iterations)

Total: 1-2 tool iterations instead of 8+.
