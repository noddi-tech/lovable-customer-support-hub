

# Fix: AI Directs Users to Wrong Place for Phone Verification

## Problem

Two issues are causing confusion:

1. **System prompt wording**: When a user is not verified, the AI says "enter your phone number in the widget above." In the actual widget, the phone/OTP input is rendered **inline below the chat messages** -- not "above." In the Admin Test Mode, there is no phone input UI at all, making the instruction nonsensical.

2. **Admin Test Mode missing `isVerified`**: The test mode never sends `isVerified: true` to the edge function, even when a test phone number is provided. This means the AI always treats the admin tester as unverified and refuses to look up customer data.

## Changes

### File: `supabase/functions/widget-ai-chat/index.ts`

Update the system prompt verification context (line 391) to remove the misleading "in the widget above" phrasing. Instead, instruct the AI to tell customers they need to verify their phone number using the verification form below the chat. The AI should NOT try to collect the phone number itself via chat -- it should direct users to the dedicated input.

**Before:**
```
...politely tell them they need to verify their phone number first by entering it in the widget above. Do NOT look up customer data without verification.
```

**After:**
```
...politely tell them they need to verify their phone number first using the phone verification form shown below. The form will ask for their phone number and send an SMS code. Do NOT try to collect the phone number in the chat -- the dedicated form handles this. Do NOT look up customer data without verification.
```

### File: `src/components/admin/widget/WidgetTestMode.tsx`

Add `isVerified: true` to the request body when a test phone number has been entered. This allows admins to test the full verified experience (booking lookups, account management) without needing to go through SMS verification in test mode.

**Change** (line 126-133): Add `isVerified` and pass the phone as the verified phone:
```typescript
body: JSON.stringify({
  widgetKey: config.widget_key,
  messages: history,
  visitorPhone: testPhone || undefined,
  language: 'no',
  test: true,
  stream: true,
  isVerified: !!testPhone,
}),
```

This means: if an admin has entered a test phone number, the AI treats them as verified and can look up that customer's data directly.

## Summary

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Fix system prompt to reference "the form below" instead of "widget above" |
| `src/components/admin/widget/WidgetTestMode.tsx` | Send `isVerified: true` when test phone is provided |
