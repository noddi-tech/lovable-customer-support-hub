

# Fix Flow Continuation After Phone Verification

## Problems

### 1. Test mode remembers verified phone
The "Start new conversation" button (`handleNewConversation`) clears messages and conversation ID but does NOT clear `noddi_ai_verified_phone` from localStorage. So when you restart a test, the phone is still verified and the AI skips the verification step entirely.

### 2. Flow prompt includes already-completed steps
When `isVerified=true`, `buildFlowPrompt` outputs the ENTIRE flow tree -- including the phone verification data collection node and the "Did the customer verify?" auto-evaluate decision. The AI receives contradictory instructions: the system prompt says "phone is verified" but the flow says "collect phone number" and "evaluate if verified." The AI doesn't know to skip past these steps to the address collection.

## Solution

### Change 1: Clear verified phone on new conversation (AiChat.tsx)

In the `handleNewConversation` callback (line ~242), also clear the verified phone state:

```typescript
const handleNewConversation = useCallback(() => {
  setMessages([...]);
  setConversationId(null);
  setVerifiedPhone('');  // ADD THIS
  localStorage.removeItem(VERIFIED_PHONE_KEY);  // ADD THIS
  // ... rest unchanged
}, [t]);
```

### Change 2: Skip completed nodes in post-verification flow prompt (edge function)

In `buildFlowPrompt` (or `buildSystemPrompt`), when `isVerified=true`, skip over:
- Data collection nodes that contain phone/tel fields (already done)
- Auto-evaluate decision nodes whose `auto_evaluate_source` references a phone field (already resolved -- phone IS verified)

Instead of skipping silently, inject a context line like:
```
ALREADY COMPLETED: Phone verification was successful. Skip directly to the next step.
```

Then continue outputting the YES branch of the auto-evaluate decision (the address step), skipping the NO branch entirely.

**Implementation in `supabase/functions/widget-ai-chat/index.ts`:**

Add a new function `buildPostVerificationFlowPrompt(flowConfig)` that:
1. Walks the node tree
2. When it encounters a data_collection node with a phone field, marks it as completed and skips it
3. When it encounters an auto-evaluate decision node linked to that phone field, automatically resolves it as TRUE and only emits the YES branch children
4. Continues outputting all remaining nodes normally (address collection, next decisions, etc.)

This way the AI receives a clean flow starting from the address step:
```
ALREADY COMPLETED: Customer phone verified successfully.

### Get address
Required data to collect:
  - Address (address format, required)
  Use [ADDRESS_SEARCH] to collect the address.

### Do we deliver?
  Evaluate: Do we deliver to this address?
  Check the result of the "Address Search" step...
```

### Change 3: Add "Clear Session" to test mode (WidgetTestMode.tsx)

Add a button to the test mode UI that clears all widget localStorage (verified phone, messages, conversation ID) so admins can re-test the full flow from scratch without ending and restarting the test.

## Files Changed

| File | Change |
|------|--------|
| `src/widget/components/AiChat.tsx` | Clear `verifiedPhone` and localStorage key in `handleNewConversation` |
| `supabase/functions/widget-ai-chat/index.ts` | Add smart flow-skipping logic in post-verification prompt to skip phone nodes and auto-resolve phone-linked decisions, outputting only the continuation (address step onwards) |
| `src/components/admin/widget/WidgetTestMode.tsx` | Add "Clear Session" button that resets all widget localStorage |

