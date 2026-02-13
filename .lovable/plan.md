

# Seed Default Action Flows

The `ai_action_flows` table was created but no default flows were inserted. We need to add a migration that seeds the 7 default action flows for the existing widget config.

## What will be created

A new SQL migration that inserts these action flows for widget `2f1fab67-4177-4a69-870f-e556ca5219bd` (org `b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b`):

| Intent | Label | Steps |
|--------|-------|-------|
| new_booking | Book New Service | Address -> Car -> Service -> Time Slot -> Summary |
| change_time | Change Booking Time | Lookup booking -> Time Slot -> Confirm edit |
| change_address | Change Booking Address | Lookup booking -> Address Search -> Confirm edit |
| change_car | Change Booking Car | Lookup booking -> License Plate -> Confirm edit |
| add_services | Add Services to Booking | Lookup booking -> Service Select -> Confirm edit |
| cancel_booking | Cancel Booking | Lookup booking -> Confirm cancellation |
| view_bookings | View My Bookings | Lookup customer -> Display bookings |

All flows requiring customer data will have `requires_verification = true`.

## Technical details

- **File**: New SQL migration
- **Action**: INSERT 7 rows into `ai_action_flows` with the correct `organization_id`, `widget_config_id`, `flow_steps` JSONB, and `trigger_phrases` arrays
- Each flow's `flow_steps` will use the established step format: `{id, type, field, marker, instruction}`
- All flows will be `is_active = true` by default

