
# Improve Post-Verification AI Flow and Fix Session Log

## Two Issues

### 1. AI dumps all order history instead of guiding the customer

**Root cause**: The system prompt (lines 386-390 in `widget-ai-chat/index.ts`) tells the AI to "proactively check for upcoming orders, wheel storage, previous orders" but gives no guidance on **how to present choices**. Combined with the auto-message "Kan du sla opp kontoen min?", the AI just lists everything it finds.

**Fix**: Rewrite the verified-user section of the system prompt to instruct the AI to behave as a guided flow:

1. After `lookup_customer`, identify the customer's **vehicles** from their booking history.
2. If multiple vehicles: ask "Which car would you like help with?" and list them as options.
3. Then ask what they want to do: "Book a new service", "Check existing bookings", "Manage wheel storage", etc.
4. If booking a new service, reference their previous orders and ask "Would you like something similar to your last order?"
5. Never dump a raw list of all past bookings unprompted.

Also update the auto-message sent after verification from the generic "sla opp kontoen min" to something that better triggers the guided flow, e.g.: "Jeg har verifisert telefonnummeret mitt. Hva kan du hjelpe meg med?"

### 2. Session Log is stuck / not updating

**Root cause**: The `WidgetTestMode` component passes `addLogEntry` callbacks only for `onTalkToHuman`, `onEmailConversation`, and `onBack`. The `AiChat` component has no `onLogEvent` prop, so there is no mechanism to report messages sent, AI responses received, tool calls, or verification events back to the session log.

**Fix**: 
- Add an optional `onLogEvent` callback prop to `AiChat`.
- Call it at key points: message sent, AI response received, verification started/completed, errors.
- In `WidgetTestMode`, pass `addLogEntry` as the `onLogEvent` handler.

## Changes

### File: `supabase/functions/widget-ai-chat/index.ts`

Update `buildSystemPrompt` for the `isVerified` branch:

```
VERIFICATION STATUS: The customer's phone number has been verified via SMS OTP.
You can freely access their account data using lookup_customer.

AFTER LOOKING UP THE CUSTOMER, follow this guided flow:
1. Greet them by name.
2. If they have UPCOMING bookings, mention them briefly (date + service) and ask if they need help with any of them.
3. If they have multiple VEHICLES in their history, ask which car they want help with.
4. Offer clear action choices:
   - "Bestille ny service" (book new service)
   - "Se mine bestillinger" (view bookings)  
   - "Endre/avbestille en bestilling" (modify/cancel)
   - "Dekkhotell" (wheel storage)
5. If booking new: reference their most recent completed order and ask "Vil du ha noe lignende?"
6. Do NOT list all previous bookings unless the customer specifically asks for their booking history.
7. Keep the initial response short and action-oriented — max 3-4 lines before presenting choices.
```

### File: `src/widget/components/AiChat.tsx`

1. Add `onLogEvent?: (event: string, details?: string, type?: 'info' | 'tool' | 'error' | 'success') => void` to `AiChatProps`.
2. Call `onLogEvent` at these points:
   - User sends a message: `onLogEvent('User message', content, 'info')`
   - AI response received: `onLogEvent('AI response', first 100 chars, 'success')`
   - Phone verification sent: `onLogEvent('Verification code sent', phone, 'tool')`
   - Phone verified: `onLogEvent('Phone verified', phone, 'success')`
   - Verification error: `onLogEvent('Verification failed', error, 'error')`
   - Streaming error: `onLogEvent('AI error', error message, 'error')`
3. Update the auto-message after verification to: `"Jeg har verifisert telefonnummeret mitt. Hva kan du hjelpe meg med?"`

### File: `src/components/admin/widget/WidgetTestMode.tsx`

Pass `addLogEntry` as `onLogEvent` to the `AiChat` component:

```tsx
<AiChat
  ...existing props
  onLogEvent={(event, details, type) => addLogEntry(event, details, type)}
/>
```

## Summary

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Rewrite verified-user system prompt to use guided flow instead of data dump |
| `src/widget/components/AiChat.tsx` | Add `onLogEvent` prop, call it at key interaction points, update auto-message text |
| `src/components/admin/widget/WidgetTestMode.tsx` | Wire `addLogEntry` into `onLogEvent` |
