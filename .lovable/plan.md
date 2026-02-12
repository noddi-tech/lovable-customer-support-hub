

# Show Only the First Available Date with Slots

## Problem
The TimeSlotBlock currently generates 14 date chips starting from the earliest date and shows them all -- but many dates have no available slots, leading to a confusing "No available slots for this date" experience (as shown in the screenshot).

## Solution
Instead of showing 14 date chips, fetch delivery windows for a wide date range (e.g., 14 days) in a single API call, then automatically find and display only the **first date that has available slots**. No date chips at all -- just show the available time slots for that date with a header like "Wed 12 Feb".

## Changes

### `src/widget/components/blocks/TimeSlotBlock.tsx`

1. **Remove the date chip UI entirely** -- no more horizontal scrollable date list
2. **Fetch a 14-day range in one call**: Use `from_date` (earliest) and `to_date` (earliest + 14 days) to get all windows at once
3. **Group windows by date**, find the first date with at least one slot
4. **Display that date's slots directly** with a simple date header (e.g., "First available: Wed 12 Feb")
5. If no slots found in the 14-day range, show a "No available times in the next 2 weeks" message

### Technical Detail

The `loadWindows` call currently only sends `from_date`. We'll also send `to_date` (earliest + 14 days) and `selected_sales_item_ids` (from `data`) to get accurate availability. The response windows will be grouped by their `start_time` date, and the first non-empty group becomes the displayed date.

**Simplified component flow:**
1. Fetch earliest_date
2. Fetch delivery_windows with from_date=earliest, to_date=earliest+14
3. Group by date, pick first date with slots
4. Render: date header + slot grid (no date chips)

