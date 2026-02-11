

# Add Booking Flow Nodes to Flow Config

## What This Does

Executes a single database UPDATE to add the 4 booking nodes to the YES branch and 1 message node to the NO branch of the "Do we deliver?" decision node in the existing flow config.

## Nodes Added

**YES branch (after "Do we deliver?" = yes):**
1. **Enter License Plate** - `license_plate` field type
2. **Choose Service** - `service` field type  
3. **Pick Time Slot** - `time_slot` field type
4. **Confirm Booking** - `booking_summary` field type

**NO branch (after "Do we deliver?" = no):**
1. **No Delivery Available** - message explaining we don't deliver to that address

## Technical Details

Single `UPDATE` on `widget_configs` table for widget `2f1fab67-4177-4a69-870f-e556ca5219bd`, modifying the `ai_flow_config` JSONB column at path `nodes[0].children[0].actions[0].children[0].yes_children[1].yes_children[1]` (the "Do we deliver?" node) to set its `yes_children` and `no_children` arrays.

No file changes needed -- database-only update.

