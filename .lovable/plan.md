

# Fix: AI Exhausts Tool Loop on "Endre tid" Action Menu Click

## Root Cause

When the user clicks "Endre tid" from the action menu, the hidden message "Endre tid" is sent to the edge function. The AI enters the booking edit flow and starts calling tools in a loop:
- It calls `get_booking_details` (needs a booking_id it may not have handy)
- Then possibly `get_delivery_windows` (despite being told not to)
- This repeats across all 8 iterations of the tool-calling loop
- After exhausting 8 iterations without a final text response, the fallback "Beklager..." message is shown

The function took 22 seconds (8 sequential OpenAI API calls + tool executions) and returned the generic fallback.

## Changes

### File: `supabase/functions/widget-ai-chat/index.ts`

**1. Add tool call logging** (in the while loop, around line 1455):
```typescript
console.log(`[widget-ai-chat] Tool iteration ${8 - maxIterations}, calling: ${toolCall.function.name}(${toolCall.function.arguments})`);
```
This lets us see exactly what tools are being called in the loop for future debugging.

**2. Strengthen system prompt for action menu selections** (in the BOOKING EDIT FLOW section, around line 1045):

Add explicit instructions:
```
IMPORTANT: When the customer selects an option from [ACTION_MENU] (e.g., "Endre tid", "Endre adresse"), 
you ALREADY have the booking details from the earlier lookup_customer or get_booking_details call in this 
conversation. Do NOT call get_booking_details again. Use the data already in the conversation context.

For "Endre tid" / time change selection:
- Extract address_id, car_ids, license_plate, and sales_item_id from the booking data ALREADY in the conversation
- Emit the [TIME_SLOT] marker immediately. Do NOT call get_delivery_windows.
- If you cannot find the required IDs in the conversation, call get_booking_details ONCE, then emit [TIME_SLOT].
```

**3. Add a safety mechanism: if the same tool is called 3+ times in the loop, force-break** (around line 1455):
```typescript
// Track tool call counts to prevent infinite loops
const toolCallCounts: Record<string, number> = {};
// ...inside the loop:
if (toolCallCounts[toolName] >= 3) {
  console.warn(`[widget-ai-chat] Tool ${toolName} called 3+ times, breaking loop`);
  break; // Force exit the loop - will fall through to fallback
}
```

### Deploy

Re-deploy `widget-ai-chat` edge function.

## Summary

| Change | Purpose |
|--------|---------|
| Add tool call logging | Debug future issues by seeing exactly what tools loop |
| Strengthen prompt for action menu | Tell AI to use existing booking data, not re-fetch |
| Add tool call count safety break | Prevent infinite tool loops by breaking after 3 calls to same tool |

## Expected Result

When the user clicks "Endre tid", the AI will recognize it already has the booking details in the conversation, extract the required IDs, and immediately emit the `[TIME_SLOT]` marker -- no tool calls needed, instant response.

