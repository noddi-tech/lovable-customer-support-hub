

## Plan: Add Reply / Reply All Toggle

### Overview
Add a toggle in the reply area so agents can choose between Reply (only to customer) and Reply All (include CC recipients). Default to Reply All when CC recipients exist.

### Changes

**1. `src/components/dashboard/conversation-view/ReplyArea.tsx`**
- Add `replyAll` state, defaulting to `true`
- Add a small toggle/button near the send area (next to the status dropdown) showing "Reply All" or "Reply" with a Users/User icon
- Pass `replyAll` into `sendReply()` call

**2. `src/contexts/ConversationViewContext.tsx`**
- Update `sendReply` signature to accept `replyAll?: boolean` parameter
- Pass `replyAll` in the edge function invocation body: `{ messageId: message.id, replyAll }`

**3. `supabase/functions/send-reply-email/index.ts`**
- Read `replyAll` from request body (default `true` for backward compatibility)
- Only call `extractCcRecipients()` and add CC to payload when `replyAll` is true
- When `replyAll` is false, skip CC entirely

### UI Design
A small segmented button or dropdown near the Send button:
```
[Reply ▾] [Send & Close ▾] [Send]
```
Where "Reply" toggles between "Reply" and "Reply All" — showing a `Users` icon for Reply All and `User` icon for Reply.

### Files changed

| File | Change |
|---|---|
| `src/components/dashboard/conversation-view/ReplyArea.tsx` | Add Reply/Reply All toggle state + UI |
| `src/contexts/ConversationViewContext.tsx` | Pass `replyAll` flag through to edge function |
| `supabase/functions/send-reply-email/index.ts` | Conditionally include CC based on `replyAll` flag |

