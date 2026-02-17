

# Fix Cancel Booking Flow: Force Stop After Lookup

## Problem

The AI tool-calling loop runs up to 8 iterations per user turn. When a user says "cancel booking":
1. The AI calls `lookup_customer` (returns booking data with IDs)
2. In the **same turn**, it immediately calls `cancel_booking` with the ID
3. The user never sees a confirmation step

This happens because:
- The `matchedFlowHint` (line 2321) says "proceed DIRECTLY to step 1" for ALL flows, including cancel
- The tool loop has no guard to stop before destructive actions
- System prompt instructions alone are not enough -- the AI optimizes for efficiency and completes everything in one turn

## Solution: Two-Layer Protection

### 1. Fix the `matchedFlowHint` for cancel_booking

In the verified message construction (line 2319-2322), make the hint flow-aware. For `cancel_booking`, override the generic "proceed DIRECTLY" hint with a specific instruction:

```
This matches the "cancel_booking" flow. After lookup, display the booking 
using [BOOKING_INFO] and ask "Er dette bestillingen du vil kansellere?" 
wrapped in [YES_NO]. Do NOT call cancel_booking until the customer confirms.
```

### 2. Add a tool-loop guard for `cancel_booking`

In the tool execution loop (around line 2425-2470), add a force-break similar to the existing group selection guard: if `cancel_booking` is about to be called AND the conversation does not yet contain an explicit user confirmation ("ja", "yes"), break the loop and force the AI to respond with text first.

```typescript
// Force-break if AI tries to cancel without prior user confirmation
if (toolName === 'cancel_booking') {
  const hasUserConfirmation = currentMessages.some(
    (m: any) => m.role === 'user' && 
    /\b(ja|yes|bekreft|confirm)\b/i.test(m.content)
  );
  if (!hasUserConfirmation) {
    console.log('[widget-ai-chat] cancel_booking blocked — no user confirmation yet');
    loopBroken = true;
    break;
  }
}
```

### 3. No database changes needed

The flow steps in `ai_action_flows` are already correct (3 steps: lookup, display, confirm). The issue is purely in the edge function runtime behavior.

## Summary

| File | Change |
|------|--------|
| `widget-ai-chat/index.ts` (matchedFlowHint) | Override hint for cancel_booking to say "show booking and ask before cancelling" |
| `widget-ai-chat/index.ts` (tool loop) | Add force-break guard preventing `cancel_booking` without prior user confirmation |

## Expected Behavior After Fix

1. User: "Jeg vil kansellere bestillingen"
2. AI verifies phone, looks up customer
3. AI shows booking card with [BOOKING_INFO] and asks "Er dette bestillingen du vil kansellere?" with [YES_NO]
4. User clicks "Ja"
5. AI calls `cancel_booking` and shows confirmation

