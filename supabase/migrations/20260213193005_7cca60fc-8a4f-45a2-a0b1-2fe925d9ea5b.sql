UPDATE ai_action_flows
SET flow_steps = '[
  {"id":"step_1","type":"lookup","field":"booking","instruction":"Identify which booking the customer wants to change. Use their verified phone to look up pending bookings."},
  {"id":"step_2","type":"collect","field":"time_slot","marker":"TIME_SLOT","instruction":"Emit the [TIME_SLOT] marker with the booking address_id and sales_item_ids from the booking details. The component will display available times automatically. Do NOT call get_delivery_windows."},
  {"id":"step_3","type":"confirm","field":"edit","marker":"BOOKING_EDIT","instruction":"Confirm the time change with the customer"}
]'::jsonb
WHERE intent_key = 'change_time';