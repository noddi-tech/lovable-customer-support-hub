
# Fix: AI Not Displaying Booking Details

## The Problem

The AI says "Det ser ut til at jeg ikke fikk tilgang til detaljene" (couldn't access booking details) even though the data IS available. Looking at the logs:

1. AI calls `get_booking_details(56789)` -- this is a hallucinated ID copied from the example in the system prompt. It gets a 404 error.
2. AI then calls `lookup_customer` which successfully returns booking #27502 with all details (address, date, time, services, car).
3. But the AI already "decided" it couldn't get details and shows plain text instead of the `[BOOKING_INFO]` card.

Two root causes:
- The system prompt step 1 says "Use `get_booking_details` first" -- but `lookup_customer` already returns everything needed. The AI shouldn't need a second call.
- The example booking ID `56789` in the prompt is being hallucinated by the AI as a real ID.

## The Fix

### 1. Change System Prompt (BOOKING EDIT FLOW section)

Remove step 1 that says "Use `get_booking_details`" and replace with: "The booking data is ALREADY available from the `lookup_customer` result. Use it directly."

Change the example IDs in the prompt from `56789` to `<REAL_ID>` placeholders to prevent hallucination.

Updated flow:
```
BOOKING EDIT FLOW:
When a customer wants to modify an existing booking:
1. The booking details are ALREADY available from the lookup_customer result 
   in this conversation. Do NOT call get_booking_details. 
   Use the booking data (id, address, date, timeSlot, services, vehicle) 
   from lookup_customer directly.
2. If the customer has only ONE active booking, present its details using 
   [BOOKING_INFO] then ask what they want to change using [ACTION_MENU].
3. If multiple bookings, ask which one using [ACTION_MENU].
```

### 2. Fix Example IDs in Prompt

Change marker example from:
```
[BOOKING_INFO]{"booking_id": 56789, "address": "Slemdalsvingen 65, ...
```
to:
```
[BOOKING_INFO]{"booking_id": <REAL_ID>, "address": "<address>", ...
```

### 3. Auto-Generate [BOOKING_INFO] Post-Processor

Strengthen the existing `patchBookingInfo` function to also detect when the AI says it "couldn't get details" but the conversation history has booking data from `lookup_customer`. In that case, auto-generate the `[BOOKING_INFO]` block from the tool result.

### 4. Remove Placeholder ID Guard for 56789-Range

The current guard only blocks IDs <= 10. But the AI is using 56789 (from the example). Instead of expanding the blocklist, removing the instruction to call `get_booking_details` in step 1 solves this at the source.

---

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change A** -- Update BOOKING EDIT FLOW prompt (around line 1220-1238):
- Step 1: Remove "Use get_booking_details" instruction. Replace with "Use booking data from lookup_customer already in conversation."
- Remove example ID 56789 from BOOKING_INFO marker docs (line 1217). Use `<REAL_ID>` placeholder.

**Change B** -- Enhance `patchBookingInfo` post-processor:
- After AI response is generated, scan conversation history for `lookup_customer` tool results
- If the AI response does NOT contain `[BOOKING_INFO]` but DOES mention booking-related text (date, address, time) OR says "ikke fikk tilgang" / "couldn't access", extract booking data from the last `lookup_customer` result and inject a `[BOOKING_INFO]` block
- Build the JSON payload from: `booking.id`, `booking.address`, `booking.scheduledAt` (formatted as date), `booking.timeSlot`, `booking.services[0]`, `booking.vehicle`

**Change C** -- Add logging for `get_booking_details` failures:
- When `executeGetBookingDetails` returns an error, log the booking ID and error to help debug future issues

### Deploy

Re-deploy `widget-ai-chat` edge function.

## Expected Result

- The AI uses booking data from `lookup_customer` directly (no extra API call needed)
- Booking details always appear in a styled `[BOOKING_INFO]` card showing date, time, service, and car
- No more "couldn't access details" messages when the data is already available
