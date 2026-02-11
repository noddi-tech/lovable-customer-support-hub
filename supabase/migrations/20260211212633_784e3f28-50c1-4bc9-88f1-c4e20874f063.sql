
UPDATE widget_configs
SET ai_flow_config = jsonb_set(
  jsonb_set(
    ai_flow_config,
    '{nodes,0,children,0,actions,0,children,0,yes_children,1,yes_children,1,yes_children}',
    '[
      {
        "id": "node_booking_plate",
        "type": "data_collection",
        "label": "Enter License Plate",
        "instruction": "Ask the customer for their car''s license plate number so we can look up their vehicle.",
        "data_fields": [{"id": "field_booking_plate", "label": "License plate", "field_type": "license_plate", "required": true}],
        "children": [], "yes_children": [], "no_children": []
      },
      {
        "id": "node_booking_service",
        "type": "data_collection",
        "label": "Choose Service",
        "instruction": "Present the available services to the customer and let them choose which service they want.",
        "data_fields": [{"id": "field_booking_service", "label": "Service", "field_type": "service", "required": true}],
        "children": [], "yes_children": [], "no_children": []
      },
      {
        "id": "node_booking_time",
        "type": "data_collection",
        "label": "Pick Time Slot",
        "instruction": "Show available dates and time slots for the selected service at the customer''s address. Let them pick a convenient time.",
        "data_fields": [{"id": "field_booking_time", "label": "Time slot", "field_type": "time_slot", "required": true}],
        "children": [], "yes_children": [], "no_children": []
      },
      {
        "id": "node_booking_summary",
        "type": "data_collection",
        "label": "Confirm Booking",
        "instruction": "Show a summary of the booking including address, car, service, date/time and price. Ask the customer to confirm or cancel.",
        "data_fields": [{"id": "field_booking_summary", "label": "Booking summary", "field_type": "booking_summary", "required": true}],
        "children": [], "yes_children": [], "no_children": []
      }
    ]'::jsonb
  ),
  '{nodes,0,children,0,actions,0,children,0,yes_children,1,yes_children,1,no_children}',
  '[
    {
      "id": "node_no_delivery",
      "type": "message",
      "label": "No Delivery Available",
      "instruction": "Apologize and explain that we unfortunately do not deliver to the customer''s address at this time. Suggest they check back later or try a different address.",
      "children": [], "yes_children": [], "no_children": []
    }
  ]'::jsonb
)
WHERE id = '2f1fab67-4177-4a69-870f-e556ca5219bd';
