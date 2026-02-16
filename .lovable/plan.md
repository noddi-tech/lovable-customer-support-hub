

# Fix: Loop Break Falls Through to Fallback Instead of Letting AI Respond

## Root Cause

When the safety break triggers (after `get_delivery_windows` is called twice), the code exits the entire while-loop and jumps straight to the hardcoded fallback message ("Beklager, men jeg trenger et oyeblikk..."). The AI never gets a chance to read the interception response and emit the `[TIME_SLOT]` marker.

The sequence:
1. AI calls `get_delivery_windows` with empty items (count 1) -- intercepted, gets "use [TIME_SLOT] marker"
2. AI calls `get_delivery_windows` again (count 2) -- safety break fires, loop exits
3. Code falls to fallback -- the AI's tool response from step 1 is wasted

When the user types "Jeg vil endre tid" directly, the AI only takes 1-2 tool calls and successfully emits [TIME_SLOT] before exhausting iterations.

## Fix

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change 1: When the loop breaks, give the AI one final OpenAI call to generate a text response** (around lines 1503-1509)

After `if (loopBroken) break;`, instead of falling directly to the fallback, make one more OpenAI call with the current messages (which include the interception response). This gives the AI a chance to produce a [TIME_SLOT] marker. If this final call also results in tool calls (not text), then fall through to the fallback.

```
After loop break:
1. Make one final OpenAI call with tool_choice: "none" (forces text output)
2. If the AI produces a text response, use it (it should contain [TIME_SLOT])
3. If it fails, fall through to the existing fallback
```

Using `tool_choice: "none"` is the key -- it forces the AI to produce a text response instead of calling tools, which is exactly what we need.

**Change 2: Also handle `get_booking_details` with wrong IDs** (around line 1135)

The logs show `get_booking_details({"booking_id":1})` -- the AI uses `1` as a placeholder. Intercept this similarly: if `booking_id` is 1 or another small placeholder, return a synthetic response telling the AI to use the booking data already in the conversation context.

## Expected Result

When user clicks "Endre tid":
1. AI calls `get_booking_details(1)` -- intercepted, told to use existing data
2. AI calls `get_delivery_windows` with empty arrays -- intercepted, told to emit [TIME_SLOT]
3. Safety break triggers
4. Final forced-text OpenAI call with `tool_choice: "none"` -- AI outputs [TIME_SLOT] marker
5. Widget renders the time slot picker

