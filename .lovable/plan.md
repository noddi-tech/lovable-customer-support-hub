

# Defer Phone Verification: Show Inline in Chat, Not Locked at Top

## Problem

The phone verification form ("Verifiser telefonnummeret ditt") is rendered as a fixed block at the top of the chat, visible immediately on load. This blocks the conversation view and forces users to deal with verification before they can even ask a question.

## Solution

Remove the phone/OTP forms from the top of the chat. Instead, show them **inline as chat messages** only when the AI tells the user to verify -- i.e., when the user asks about their account/bookings and the AI responds that verification is needed.

### How It Works

1. The chat starts with **no verification form visible** -- the user can immediately chat with the AI
2. When the user asks about their bookings/account, the AI responds saying they need to verify their phone
3. The AI's response triggers the phone form to appear **inline in the chat flow**, as a special message-like element after the AI's message
4. After entering phone and OTP, the verified badge appears inline too
5. The conversation continues naturally below

### Implementation

#### File: `src/widget/components/AiChat.tsx`

1. **Change initial verification step** from `'phone'` to `'idle'` (new state meaning "not yet triggered"):
   - Add `'idle'` to the verification step type: `'idle' | 'phone' | 'pin' | 'verified'`
   - Default to `'idle'` instead of `'phone'` (unless already verified from localStorage)

2. **Remove the top-level phone/OTP blocks** (lines 304-460) from their current position above the messages

3. **Add a `showVerificationPrompt` state** (boolean, default false) that gets set to `true` when the AI mentions verification is needed

4. **Detect verification trigger**: After receiving an AI response, check if the response content contains verification-related keywords (e.g., "verifiser", "verify your phone", "telefonnummer"). If so, set `showVerificationPrompt = true` and `verificationStep = 'phone'`

5. **Render phone/OTP forms inline** inside the messages area (after the last message), only when `showVerificationPrompt` is true and step is `'phone'` or `'pin'`

6. **Keep verified badge inline** -- move it into the messages area too

#### File: `supabase/functions/widget-ai-chat/index.ts`

7. **Update system prompt** (unverified context): Change "using the phone verification form shown below" to "using the phone verification form that will appear" -- since it now appears after the AI's message, not "below" in a fixed position

### Technical Details

```
Before (current):
+---------------------------+
| [Back]    [New Conv]      |
| +---------------------+  |
| | Verifiser telefon..  |  |  <-- Always visible, blocks view
| | [+47] [________] [->]|  |
| | [Hopp over]          |  |
| +---------------------+  |
| [AI greeting message]    |
| [User message]           |
| [AI response]            |
+---------------------------+

After (proposed):
+---------------------------+
| [Back]    [New Conv]      |
| [AI greeting message]    |
| [User: "mine bestillinger"]|
| [AI: "Du må verifisere..."]|
| +---------------------+  |
| | Verifiser telefon..  |  |  <-- Appears inline, only when needed
| | [+47] [________] [->]|  |
| | [Hopp over]          |  |
| +---------------------+  |
+---------------------------+
```

| File | Change |
|------|--------|
| `src/widget/components/AiChat.tsx` | Add `'idle'` state, move phone/OTP forms inline into messages area, trigger on AI verification response |
| `supabase/functions/widget-ai-chat/index.ts` | Update prompt text: "form shown below" to "form that will appear" |

