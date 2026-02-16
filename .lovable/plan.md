

# Fix AI Chatbot Booking Flow Issues

## Issues Found

### Issue 1: AI types out booking details as text before the summary component
The AI writes a full text recap (service, address, car, date/time, price as bullet points) before emitting the [BOOKING_SUMMARY] marker. The system prompt already says "your ENTIRE response must be ONLY the marker" but the AI is not following this strictly enough.

**Root cause**: The system prompt instruction at line 962-963 needs stronger reinforcement. The AI treats it as a suggestion rather than a hard constraint.

**Fix**: Add an explicit negative example and stronger wording in the BOOKING_SUMMARY section of the system prompt (line 962-968), and also add a post-confirmation instruction.

### Issue 2: No "Order Confirmed" overview component after booking
After a booking is confirmed, the AI types out all details as a bullet list instead of showing a structured component. There is no component for displaying a confirmed booking overview.

**Fix**: Create a new `BookingConfirmedBlock` component and register it with marker `[BOOKING_CONFIRMED]`. Add system prompt instructions telling the AI to use this marker after successful booking creation. The component will show booking number, service, address, car, date/time, and price in a styled card (similar to BookingSummaryBlock but read-only with a green success header).

### Issue 3: "Do you want to change the time?" should use [YES_NO] component
The AI asks "Onsker du a endre tidspunkt pa denne bestillingen?" as plain text instead of using the [YES_NO] interactive marker.

**Root cause**: The system prompt at line 979 says "NEVER ask plain text yes/no questions. ALWAYS use [YES_NO] or [ACTION_MENU]" but this rule isn't being followed consistently. Need stronger reinforcement.

**Fix**: Add a dedicated rule in the system prompt under BOOKING EDIT FLOW that explicitly states: when asking if the customer wants to change something about their booking, ALWAYS use [YES_NO] marker. Also reinforce the same for confirming changes.

### Issue 4: BookingEditConfirmBlock doesn't show the date
The confirm changes component only shows the time change but not the date.

**Root cause**: In `BookingEditConfirmBlock.tsx` line 152, the date row is only added if `changes.date` exists. The AI's BOOKING_EDIT JSON doesn't include `date` and `old_date` fields. The system prompt example (line 808/971) doesn't mention date fields either.

**Fix**: 
- Update the system prompt BOOKING_EDIT example to include `date` and `old_date` fields
- Update BookingEditConfirmBlock to extract date from `delivery_window_start` if `changes.date` is not explicitly provided
- Update `patchBookingEdit` to auto-populate date fields from delivery window timestamps

### Issue 5: "Booking updated!" shown but booking wasn't actually changed
The confirm changes component shows `booking_id: 12345` (a placeholder from the AI). The real booking ID should come from the conversation context. The update call may have gone to a non-existent booking or wrong booking.

**Root cause**: The AI is emitting `"booking_id": 12345` (the example value from the system prompt) instead of the real booking ID from `get_booking_details`. The `patchBookingEdit` function doesn't validate or inject the real booking_id.

**Fix**: 
- Update `patchBookingEdit` to extract the real booking_id from conversation context (from get_booking_details tool results)
- Update the system prompt to emphasize using REAL booking IDs from tool results, not the example values
- Add validation in `BookingEditConfirmBlock` to reject obviously fake booking IDs (like 12345, 99999)

---

## Technical Changes

### File 1: `supabase/functions/widget-ai-chat/index.ts`

**System prompt changes (lines 962-985)**:
- Strengthen BOOKING_SUMMARY marker-only rule with explicit "NEVER write text before/after the marker. No recap, no bullet list, no 'Her er oppsummeringen'."
- Add BOOKING_CONFIRMED marker instructions: "After a booking is successfully confirmed, output ONLY [BOOKING_CONFIRMED]{...}[/BOOKING_CONFIRMED] with the booking details. Do NOT list details as text."
- Add `date`/`old_date` to BOOKING_EDIT example JSON
- Strengthen YES_NO usage rule: "When asking a binary question (e.g., 'Do you want to change X?'), you MUST use [YES_NO]. NEVER ask as plain text."
- Emphasize real booking_id usage: "Use the EXACT booking_id from get_booking_details. NEVER use example values like 12345."

**patchBookingEdit function (lines 404-447)**:
- Extract real booking_id from conversation context (scan for get_booking_details tool results)
- Auto-populate `date`/`old_date` from delivery window timestamps
- Validate booking_id is not a placeholder

### File 2: `src/widget/components/blocks/BookingEditConfirmBlock.tsx`

- Auto-derive date from `delivery_window_start`/`delivery_window_end` if `changes.date` not provided
- Add validation: if booking_id looks like a placeholder (12345, 99999, etc.), show a warning

### File 3: `src/widget/components/blocks/BookingConfirmedBlock.tsx` (NEW)

- New read-only component showing confirmed booking details
- Green success header with booking number
- Rows for service, address, car, date, time, price
- Register with marker `[BOOKING_CONFIRMED]`/`[/BOOKING_CONFIRMED]`

### File 4: `src/widget/components/blocks/index.ts`

- Import the new BookingConfirmedBlock

### File 5: `src/widget/utils/parseMessageBlocks.ts`

- Ensure the new `booking_confirmed` block type is handled (should work automatically via registry)

### Deploy

Re-deploy `widget-ai-chat` edge function after changes.

