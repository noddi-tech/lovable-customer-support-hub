
# Fix Cancel Booking Flow: Show Booking Before Cancelling

## Problem

The cancel booking flow currently jumps straight from phone verification to cancellation without showing the customer which booking will be cancelled. The user wants:
1. Look up and display the booking
2. Ask "Is this the one you want to cancel?" with Yes/No
3. On "Ja" (Yes), cancel and show confirmation

## Root Cause

The current `cancel_booking` flow steps in the database are:
1. **Lookup** - Find the booking
2. **Confirm** - Confirm cancellation (generic CONFIRM marker)

Missing: a step to **display the booking details** and ask the customer to verify it's the right one before proceeding.

## Changes

### 1. Update `cancel_booking` flow steps in the database

Update the flow from 2 steps to 3 steps:

| Step | Type | Instruction |
|------|------|-------------|
| 1 | lookup | Look up the customer's bookings. If multiple, show [BOOKING_SELECT]. If only one, proceed to step 2. |
| 2 | display | Show the booking details using [BOOKING_INFO] and ask "Er dette bestillingen du vil kansellere?" wrapped in [YES_NO]. Wait for the customer's answer before proceeding. |
| 3 | confirm | Only if the customer confirmed "Ja": call cancel_booking with the booking ID. Then display a cancellation confirmation message. |

This will be done via a SQL update on the `ai_action_flows` table.

### 2. Update system prompt in `widget-ai-chat/index.ts`

Add an explicit instruction in the verification context section (around line 1847) reinforcing the cancel flow behavior:

```
- For cancel_booking: After identifying the booking, ALWAYS display it with [BOOKING_INFO] 
  and ask the customer to confirm with [YES_NO] before calling cancel_booking. 
  NEVER cancel without showing what will be cancelled first.
```

### 3. Update `patchBookingInfo` guard in `widget-ai-chat/index.ts`

The current guard skips `[BOOKING_INFO]` injection when `didCancelBookingSucceed` returns true. This is correct for *after* cancellation. But we also need to ensure that during the cancel flow (before the actual cancel call), `patchBookingInfo` still injects the card. No change needed here -- the existing logic already handles this correctly since `didCancelBookingSucceed` only returns true after the cancel tool call succeeds.

### 4. Deploy edge function

Redeploy `widget-ai-chat` to pick up prompt changes.

## Summary

| What | Change |
|------|--------|
| Database (`ai_action_flows`) | Update cancel_booking flow: 2 steps to 3 steps (lookup, display+confirm, cancel) |
| `widget-ai-chat/index.ts` (system prompt) | Add explicit "show before cancel" instruction |
| Deploy | Redeploy edge function |
