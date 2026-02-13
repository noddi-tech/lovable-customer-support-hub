UPDATE ai_action_flows
SET flow_steps = '[
  {"id":"step_1","type":"lookup","field":"booking","instruction":"Use lookup_customer with the verified phone. The response includes future bookings with address_id, car_ids, sales_item_ids, and license_plate. If only one upcoming booking exists, confirm it is the one they want to change. If multiple, ask which one. Extract the address_id, car_ids, sales_item_ids, and license_plate from the chosen booking for the next step."},
  {"id":"step_2","type":"collect","field":"time_slot","marker":"TIME_SLOT","instruction":"Emit the [TIME_SLOT] marker using the address_id, car_ids, license_plate, and first sales_item_id from the booking identified in step 1. Do NOT call get_delivery_windows. The component fetches and displays available times automatically."},
  {"id":"step_3","type":"confirm","field":"edit","marker":"BOOKING_EDIT","instruction":"Show the [BOOKING_EDIT] marker with the booking_id, the old time from the booking details, and the new time selected by the customer."}
]'::jsonb
WHERE intent_key = 'change_time';