

# Add Booking Flow to the AI Chatbot Flow Config

## What This Does

Updates the existing flow configuration in the database to wire up the new booking components after the "Do we deliver?" decision node. After this change, the "Book new service" path will be:

1. Existing customer? (auto-skipped if verified)
2. Verify phone (auto-skipped if verified)
3. Did customer verify? (auto-resolved if verified)
4. Get address (`address` field -- already exists)
5. Do we deliver? (auto-evaluate -- already exists)
6. **YES branch continuation (NEW):**
   - License Plate (`license_plate` field)
   - Service Selection (`service` field)
   - Time Slot (`time_slot` field)
   - Booking Summary (`booking_summary` field)

## Implementation

This is a single database update to the `widget_configs.ai_flow_config` JSON column. I will add `yes_children` to the "Do we deliver?" decision node (`node_1770827456301_5hbk`) containing four new data collection nodes chained together:

```text
Do we deliver? (existing node)
  YES -->
    [License Plate] "Enter your car's license plate"
      --> [Service Select] "Choose a service"
        --> [Time Slot] "Pick a date and time"
          --> [Booking Summary] "Review and confirm your booking"
  NO -->
    (escalation or message saying "Sorry, we don't deliver there")
```

Each new node uses the correct `field_type` that maps to the registered block components:

| Node Label | field_type | Block Component |
|-----------|-----------|-----------------|
| Enter License Plate | `license_plate` | LicensePlateBlock |
| Choose Service | `service` | ServiceSelectBlock |
| Pick Time Slot | `time_slot` | TimeSlotBlock |
| Confirm Booking | `booking_summary` | BookingSummaryBlock |

I will also add a "no" branch to the "Do we deliver?" node with a message explaining the service area limitation.

## Technical Details

### File Changed

| File | Change |
|------|--------|
| None (database update) | Update `ai_flow_config` JSON in `widget_configs` table for the existing widget |

The update targets widget ID `2f1fab67-4177-4a69-870f-e556ca5219bd`. The change modifies only the `yes_children` and `no_children` arrays of the "Do we deliver?" decision node, leaving all other flow nodes untouched.

### New Nodes Added

```text
node_booking_plate  -> data_collection, field_type: license_plate
node_booking_service -> data_collection, field_type: service
node_booking_time   -> data_collection, field_type: time_slot
node_booking_summary -> data_collection, field_type: booking_summary
```

All nodes will have clear `instruction` text so the AI knows what to say at each step. After this update you can immediately test the full booking flow in the Test tab.

