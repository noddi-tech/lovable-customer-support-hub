

# Fix: Hidden Messages Lost from AI Conversation History

## Root Cause Analysis

### Issue 1: "Missing address" error in TimeSlotBlock

The `handleActionSelect` change to send all block actions as `hidden: true` broke the AI's ability to see previous selections. Here is what happens:

1. User selects address -> `sendMessage(addressJSON, undefined, { hidden: true })` is called
2. Because `isHidden` is true, the message is **NOT added to `messages` state** (line 171-173 in AiChat.tsx)
3. The AI receives the address payload in that single request and responds with the next step (license plate)
4. When the car is looked up -> `sendMessage(carJSON, undefined, { hidden: true })` is called
5. Again, this message is **NOT added to `messages` state**
6. The AI builds `history` from `messages` state (line 179) -- but the address and car payloads are missing from it
7. The AI cannot extract `address_id` or `car_ids` because it never saw them in previous messages
8. It emits `[TIME_SLOT]{"address_id": 0, "car_ids": [0]}` or similar
9. TimeSlotBlock sees `address_id = 0`, which `Number(0)` evaluates to falsy -> "Missing address"

### Issue 2: "Chat jumped out" when selecting car

The `sendMessage` function has an `isLoading` guard on line 165: `if (!content || isLoading) return`. If the AI is still streaming a response when the user interacts with the LicensePlateBlock (which can happen since lookup is async), the subsequent `sendMessage` call is silently dropped. The car data never reaches the AI.

## Solution

### Fix 1: Add hidden messages to state (but don't render them)

Hidden messages must be stored in `messages` state so they appear in future conversation history. The `hidden` flag already exists on the message type -- we just need to add them to state while not rendering them in the UI.

In `sendMessage` (AiChat.tsx line 170-173), change:
```text
BEFORE:
  const userMessage = { ..., hidden: isHidden };
  if (!isHidden) {
    setMessages((prev) => [...prev, userMessage]);
  }

AFTER:
  const userMessage = { ..., hidden: isHidden };
  setMessages((prev) => [...prev, userMessage]);  // Always add to state
```

The rendering code already filters visible messages, so hidden messages won't show as bubbles.

### Fix 2: Don't drop messages when loading

Remove or relax the `isLoading` guard for hidden messages so block selections are never silently dropped. Queue the message to be sent after the current stream completes if needed.

In `sendMessage` (AiChat.tsx line 165), change:
```text
BEFORE:
  if (!content || isLoading) return;

AFTER:
  if (!content) return;
  if (isLoading && !options?.hidden) return;  // Only block visible user input while loading
```

For hidden messages sent while loading, we need to at minimum add them to state so they appear in the next history. We can skip the AI call if loading and let the next interaction pick them up.

### Fix 3: Verify message rendering filters hidden messages

Check that the message rendering loop in AiChat.tsx filters out `hidden` messages so they don't appear as bubbles.

### Fix 4: Fix the SERVICE_SELECT marker instruction inconsistency

In the system prompt (line 954-955), the SERVICE_SELECT example does NOT include address_id:
```
[SERVICE_SELECT][/SERVICE_SELECT]
```
But the BLOCK_PROMPTS instruction (line 540-543) does require it. Update the system prompt example to match:
```
[SERVICE_SELECT]{"address_id": 2860}[/SERVICE_SELECT]
```

Also, the TIME_SLOT system prompt example on line 957-958 still mentions `selected_sales_item_ids` which contradicts the BLOCK_PROMPTS instruction on line 560 that says "You do NOT need selected_sales_item_ids". Remove it from the example.

## Files to Change

1. **`src/widget/components/AiChat.tsx`**
   - Always add messages (including hidden) to `messages` state
   - Allow hidden messages through even when `isLoading` is true
   - Verify rendering filters hidden messages from display

2. **`supabase/functions/widget-ai-chat/index.ts`**
   - Fix SERVICE_SELECT example in system prompt (add address_id)
   - Fix TIME_SLOT example in system prompt (remove selected_sales_item_ids)

## Deployment

Edge function `widget-ai-chat` needs redeployment after prompt fix.
