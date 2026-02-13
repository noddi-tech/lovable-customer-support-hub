
# Fix: AI Exhausts Iterations After Phone Verification in "Change Time" Flow

## Root Cause

After phone verification, the AI receives the translated `__VERIFIED__` message with the user's intent ("Kan jeg endre tidspunkt"). It correctly calls `lookup_customer` (1 iteration), but then **wastes remaining iterations** calling `get_booking_details` or `get_delivery_windows` instead of going straight to the `[TIME_SLOT]` marker.

The problem is twofold:

1. **The `__VERIFIED__` replacement message** (line 1176) says "continue with the next step in the flow" but doesn't explicitly name which flow or what the next step is. The AI has to re-interpret the intent from scratch.

2. **The `change_time` flow step 1** says "Use lookup_customer" but after getting the result, the AI likely calls `get_booking_details` anyway (because the system prompt's "Booking Edit Flow" section at line 876 says "Use get_booking_details to fetch the current booking"). This wastes 2+ more iterations per booking, pushing past the limit.

## Fix (2 changes, same file)

### 1. Make `__VERIFIED__` replacement explicitly reference the matched flow

**File: `supabase/functions/widget-ai-chat/index.ts`** (lines 1162-1179)

When replacing `__VERIFIED__`, scan the action flows' trigger phrases to identify the matching flow and inject its name and first step directly into the replacement message:

```typescript
// After finding userIntent, also detect which flow matches
let matchedFlowHint = '';
if (userIntent) {
  const intentLower = userIntent.toLowerCase();
  for (const flow of actionFlows) {
    if (!flow.is_active) continue;
    const matches = flow.trigger_phrases.some(
      p => intentLower.includes(p.toLowerCase())
    );
    if (matches && flow.flow_steps.length > 0) {
      matchedFlowHint = ` This matches the "${flow.intent_key}" flow. After lookup, proceed DIRECTLY to step 1: ${flow.flow_steps[0].instruction}`;
      break;
    }
  }
}
```

Then append `matchedFlowHint` to the replacement message. This tells the AI exactly which flow to follow and what the first step is, eliminating guesswork.

### 2. Add an explicit instruction to NOT call `get_booking_details` when `lookup_customer` already provides all needed IDs

**File: `supabase/functions/widget-ai-chat/index.ts`** -- `change_time` flow step 1 instruction is already correct (it says to use `lookup_customer`), but the system prompt's "Booking Edit Flow" section (line 876-880) tells the AI to always call `get_booking_details`. Add a clarification to the `change_time` step 1:

Update the `__VERIFIED__` replacement to include: "Do NOT call get_booking_details if lookup_customer already returned the booking with address_id, car_ids, sales_item_ids, and license_plate."

## Technical Details

| File | Lines | Change |
|---|---|---|
| `supabase/functions/widget-ai-chat/index.ts` | 1162-1179 | Detect matched flow from intent + trigger phrases; inject flow name and step 1 instruction into the `__VERIFIED__` replacement message |

Redeploy `widget-ai-chat` after the change.

## Why This Fixes It

Currently the AI uses ~4-6 iterations on unnecessary tool calls after verification. With the explicit flow hint:

1. `lookup_customer` -- 1 iteration (tool call)
2. AI sees "This matches change_time, proceed to step 1" and the step says to extract IDs and confirm the booking -- 0 iterations (text reply)
3. Customer confirms, AI sees step 2 says emit `[TIME_SLOT]` -- 0 iterations (text reply with marker)

Total: 1-2 tool iterations instead of 8+.
