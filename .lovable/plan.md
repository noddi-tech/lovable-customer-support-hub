
# Fix: AI Should Accept Phone Numbers Directly in Test Mode

## Problem

The Admin Test Mode (WidgetTestMode) is a plain chat interface -- it has no phone verification form. But the system prompt tells the AI "use the phone verification form shown below," which doesn't exist in test mode. The user types their phone number in the chat, and the AI refuses to accept it.

## Solution

Pass the `test` flag into `buildSystemPrompt` and add test-mode-specific instructions that tell the AI to accept phone numbers directly in chat (no SMS verification needed).

## Changes

### File: `supabase/functions/widget-ai-chat/index.ts`

**1. Update `buildSystemPrompt` signature** to accept a `test` parameter:

```typescript
function buildSystemPrompt(language: string, isVerified: boolean, isTest: boolean = false): string {
```

**2. Add test-mode override for verification context** -- when `isTest` is true AND the user is not yet verified, tell the AI to accept phone numbers directly in the chat and treat them as verified:

```typescript
const verificationContext = isVerified
  ? `VERIFICATION STATUS: The customer's phone number has been verified...` // (existing verified text)
  : isTest
    ? `VERIFICATION STATUS: This is a TEST session. The customer has not provided a phone number yet. If they provide a phone number in the chat, accept it directly and use the lookup_customer tool with it immediately — no SMS verification is needed in test mode. Be helpful and proceed with account lookup once they share their number.`
    : `VERIFICATION STATUS: The customer has NOT verified their phone via SMS...` // (existing unverified text)
```

**3. Pass `test` when calling `buildSystemPrompt`** (around line 633):

```typescript
const systemPrompt = buildSystemPrompt(language, isVerified, test);
```

### Summary

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Add `isTest` param to `buildSystemPrompt`, add test-mode instructions that accept phone numbers directly in chat |
