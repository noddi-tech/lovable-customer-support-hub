

# Fix Post-Verification Flow: Skip Completed Steps and Remove Ghost Message

## Problems

### 1. Ghost message "Jeg har verifisert telefonnummeret mitt..."
After phone verification succeeds, the widget auto-sends this as a visible customer message (line 233 in AiChat.tsx). The user didn't type it -- it's confusing and clutters the chat. It should be sent as a hidden/system message that triggers the AI but doesn't appear in the chat bubble.

### 2. Flow doesn't skip to address step after verification
The current skip logic (`buildPostVerificationNodes`) only recognizes two kinds of nodes to skip:
- Data collection nodes with phone fields
- Auto-evaluate decisions with phone-related source keywords

But looking at the actual flow tree, the structure is:

```text
"New Decision: customer is existing" (regular decision, NOT auto-evaluate)
  YES branch:
    "Verify customer data" (phone collection -- should skip)
      "Did the customer verify?" (auto-evaluate, phone-linked -- should auto-resolve YES)
        YES branch:
          "Get address" (this is where the AI should continue)
```

The "customer is existing" decision is the FIRST node. The skip logic encounters it, doesn't recognize it as phone-related, and outputs it normally with YES/NO buttons. That's why the AI asks "Har du bestilt for?" instead of jumping to the address step.

The fix: when `isVerified=true`, the system needs to trace the path from the root down to the phone verification node. Every decision node along that path should be auto-resolved as TRUE (because verification already happened, meaning the customer went through the YES branches to get there). Only nodes AFTER the phone verification chain should be emitted in the prompt.

## Solution

### Change 1: Make the post-verification trigger invisible (AiChat.tsx)

Change line 233 so the auto-sent message after verification is hidden from the chat UI but still sent to the AI. Instead of adding a visible user message, send it as a system-level trigger:

```typescript
// Before (visible user message):
sendMessage('Jeg har verifisert telefonnummeret mitt...', phone);

// After (hidden trigger -- message sent to AI but not shown in chat):
sendMessage('__VERIFIED__', phone, { hidden: true });
```

The `sendMessage` function will still send the message to the edge function, but the message won't be rendered in the chat. The edge function already knows verification status from the `verifiedPhone` parameter, so the message content doesn't matter -- it just needs to trigger the AI to respond.

### Change 2: Smarter flow skipping -- trace path to phone node (edge function)

Replace the current `buildPostVerificationNodes` with a two-phase approach:

**Phase 1: Find the path to the phone verification node.** Walk the entire tree and record which nodes are "on the path" to the phone collection node. This includes all ancestor decisions that lead to the YES branch containing the phone node.

**Phase 2: Build a filtered prompt.** When outputting nodes:
- Skip data collection nodes with phone fields (already done)
- Skip auto-evaluate decisions linked to phone (already done)
- Auto-resolve as TRUE any decision node that is an ancestor of the phone node (the "customer is existing" decision falls into this category -- we take its YES branch automatically)
- Output everything else normally

This means the AI receives a prompt like:
```text
ALREADY COMPLETED: Customer phone verified. Customer is existing (verified).

### Get address
Required data to collect:
  - Address (address format, required)
  Use [ADDRESS_SEARCH] to collect the address.

### Do we deliver?
  Evaluate: Do we deliver to this address?
  ...
```

### Change 3: Handle the hidden message in the edge function

Update the edge function to recognize the `__VERIFIED__` trigger message and treat it as a system instruction rather than a customer question. When this trigger is received, the AI should proceed with the post-verification flow (look up customer, then follow the remaining flow steps).

## Files Changed

| File | Change |
|------|--------|
| `src/widget/components/AiChat.tsx` | Make post-verification auto-message hidden (not rendered in chat bubbles). Add `hidden` flag support to messages. |
| `supabase/functions/widget-ai-chat/index.ts` | Replace `buildPostVerificationNodes` with path-tracing logic that auto-resolves ALL decisions between root and phone node. Handle `__VERIFIED__` trigger message. |

## Expected Result

After these changes:
1. Phone verification completes -- no ghost message appears in chat
2. AI automatically looks up the customer and skips directly to the address collection step
3. The "customer is existing" decision is never shown to verified customers
4. The full flow (address -> do we deliver? -> etc.) continues as designed

