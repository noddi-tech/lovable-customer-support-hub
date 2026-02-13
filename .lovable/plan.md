

# Fix: "Change Booking Time" Flow Showing Text Instead of Interactive Component

## Problem

The screenshot shows the AI listing delivery windows as plain text bullets ("06:00 - 11:00", "08:00 - 11:00", etc.) instead of rendering the interactive `[TIME_SLOT]` date/time picker component. The AI is calling the `get_delivery_windows` tool server-side and then dumping the results as text, when it should simply emit the `[TIME_SLOT]` marker and let the client-side component fetch and display the windows itself.

## Root Cause

Two issues work together:

1. **The `change_time` flow step instruction** says "Show available delivery windows and let customer pick a new time" -- the AI interprets "show available delivery windows" literally by calling the `get_delivery_windows` tool and presenting results as text.

2. **The TIME_SLOT block prompt** lacks the strict "ONLY output the marker, no text" rule that ADDRESS_SEARCH and LICENSE_PLATE already have. It also doesn't explicitly tell the AI to NOT call `get_delivery_windows` itself.

## Changes

### File 1: `supabase/functions/widget-ai-chat/index.ts`

**Change A -- Update the TIME_SLOT block prompt** (around line 689-691):

Add the same strict "entire response must be ONLY the marker" rule and explicitly forbid calling `get_delivery_windows`:

```
TIME_SLOT: `Your ENTIRE response must be ONLY the [TIME_SLOT] marker. No text before or after.
[TIME_SLOT]{"address_id": <number>, "car_ids": [<number>], "license_plate": "<string>", "sales_item_id": <number>}[/TIME_SLOT]
Extract all IDs from previous steps (booking details, service selection, etc.).
DO NOT call get_delivery_windows — the widget component fetches and displays time slots automatically.
NEVER list delivery windows as text. The interactive component handles everything.`
```

**Change B -- Update the TIME_SLOT section in the main system prompt** (around line 846-848):

Add explicit instruction:

```
11. TIME SLOT -- show available time slots:
Output ONLY this marker and NOTHING else in the message. The component fetches delivery windows automatically.
[TIME_SLOT]{"address_id": 2860, "car_ids": [555], "license_plate": "EC94156", "sales_item_id": 60282}[/TIME_SLOT]
Extract sales_item_id from the customer's service selection message.
DO NOT call get_delivery_windows yourself. NEVER list time slots as plain text.
```

**Change C -- Update the `change_time` action flow step instruction in the database** by running a SQL update:

Update step 2's instruction from "Show available delivery windows and let customer pick a new time" to something that clearly directs the AI to emit the marker:

```sql
UPDATE ai_action_flows
SET flow_steps = '[
  {"id":"step_1","type":"lookup","field":"booking","instruction":"Identify which booking the customer wants to change. Use their verified phone to look up pending bookings."},
  {"id":"step_2","type":"collect","field":"time_slot","marker":"TIME_SLOT","instruction":"Emit the [TIME_SLOT] marker with the booking address_id and sales_item_ids from the booking details. The component will display available times automatically. Do NOT call get_delivery_windows."},
  {"id":"step_3","type":"confirm","field":"edit","marker":"BOOKING_EDIT","instruction":"Confirm the time change with the customer"}
]'::jsonb
WHERE intent_key = 'change_time';
```

### File 2: No frontend changes needed

The `TimeSlotBlock.tsx` already handles fetching and displaying delivery windows correctly (and with the Oslo timezone fix from the previous change).

## Summary

| What | Where | Change |
|------|-------|--------|
| TIME_SLOT block prompt | Edge function, line ~689 | Add "ONLY marker, no text" and "do NOT call get_delivery_windows" |
| TIME_SLOT system prompt section | Edge function, line ~846 | Add same strict rules as ADDRESS_SEARCH |
| change_time flow step instruction | Database (ai_action_flows) | Clarify that step 2 should emit marker, not call tool |

This ensures the AI emits the interactive time slot picker instead of listing windows as text, matching the behavior of other markers like ADDRESS_SEARCH and LICENSE_PLATE.
