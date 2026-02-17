UPDATE ai_action_flows SET flow_steps = '[
  {
    "id": "step_1",
    "type": "lookup",
    "field": "booking",
    "marker": "",
    "instruction": "Identify which booking the customer wants to cancel. Use their verified phone to look up pending bookings. If multiple bookings exist, show [BOOKING_SELECT] so the customer can pick which one. If only one booking exists, proceed to step 2."
  },
  {
    "id": "step_2",
    "type": "display",
    "field": "booking_confirmation",
    "marker": "",
    "instruction": "Display the selected booking details using [BOOKING_INFO]. Then ask the customer: Er dette bestillingen du vil kansellere? Wrap this question in [YES_NO]. Wait for the customer to answer before proceeding. Do NOT call cancel_booking yet."
  },
  {
    "id": "step_3",
    "type": "confirm",
    "field": "cancellation",
    "marker": "",
    "instruction": "Only if the customer confirmed Ja in the previous step: call cancel_booking with the booking ID. Then display a cancellation confirmation message. If the customer said Nei, ask what they would like to do instead."
  }
]'::jsonb, updated_at = now() WHERE intent_key = 'cancel_booking';