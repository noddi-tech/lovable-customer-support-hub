

# Fix Cancel Booking Flow: Wrong YES/NO + Missing BOOKING_SELECT

## Problem

When a customer with multiple bookings asks to cancel, two things go wrong:

1. The AI outputs a plain-text question ("Hvilken bestilling onsker du a kansellere?") with a numbered list instead of using the interactive [BOOKING_SELECT] component
2. The `patchYesNo` post-processor incorrectly wraps that question in [YES_NO] markers because it matches the pattern "Onsker du a ... kansellere"
3. Clicking "Ja" then tells the AI "yes, cancel" -- which cancels ALL bookings instead of letting the user pick

## Changes

### 1. `supabase/functions/widget-ai-chat/index.ts` -- patchYesNo exclusion

Add a check: skip wrapping in [YES_NO] if the reply contains a **numbered list** (e.g., `1.`, `2.`). A numbered list means the AI is presenting choices, not asking a binary question.

```typescript
// Skip if reply contains a numbered list (selection question, not binary)
if (/\n\s*\d+\.\s/.test(reply)) return reply;
```

Also add a check for "hvilken" (which one) -- these are selection questions, never yes/no:

```typescript
// Skip if question uses "hvilken/hvilke" (selection, not binary)
if (/\bhvilke[nt]?\b/i.test(reply)) return reply;
```

### 2. `supabase/functions/widget-ai-chat/index.ts` -- System prompt

Add explicit instruction to the cancel_booking flow section telling the AI to use [BOOKING_SELECT] when the customer has multiple bookings and wants to cancel, rather than listing them as text with a question.

Add near the existing BOOKING_SELECT instruction (around line 1822):

```
- For cancel_booking with multiple bookings: show [BOOKING_SELECT] so the customer can pick which booking(s) to cancel. NEVER list bookings as a numbered text list with a question.
```

### 3. Deploy edge function

Redeploy `widget-ai-chat` to apply the changes.

## Summary

| File | Change |
|------|--------|
| `widget-ai-chat/index.ts` (patchYesNo) | Skip when reply has numbered lists or "hvilken/hvilke" |
| `widget-ai-chat/index.ts` (system prompt) | Instruct AI to use BOOKING_SELECT for cancel flow |

