

## Fix Widget Reply Email Delivery and LIVE Badge

### Problem

Two issues with widget/chat conversations:

1. **No email sent for replies**: When an agent replies to a widget conversation (contact form or ended live chat), the reply is silently saved but never emailed to the customer. The customer has no way to see the response.
2. **Misleading LIVE badge**: All open widget conversations show a "LIVE" badge, even contact form submissions where no one is actively chatting.

### Solution

#### 1. Send email replies when chat is not actively live

**File: `src/contexts/ConversationViewContext.tsx` (~line 444-455)**

Change the reply logic from "never send email for widget channel" to "check if the chat session is still active before skipping email":

- Instead of `if (conversationChannel !== 'widget')`, query `widget_chat_sessions` for this conversation to check if there is an active session (status = `'active'` AND `last_seen_at` within last 30 seconds).
- If the session is active (visitor is online and chatting) -- skip email (visitor sees the reply in real-time).
- If the session is ended, abandoned, waiting, or there is no session at all (contact form) -- send the reply email.

**File: `supabase/functions/send-reply-email/index.ts` (~line 66-80)**

Update the edge function with the same logic:

- Instead of blanket-skipping all `widget` channel conversations, query `widget_chat_sessions` for the conversation.
- Only skip if there is an active session with recent `last_seen_at` (within 60 seconds as a generous window).
- Otherwise, proceed with sending the email as normal.

This means:
- Contact form submissions: agent replies are emailed (no active session exists)
- Ended/abandoned live chats: agent replies are emailed (session is not active)
- Active live chats: agent replies appear in real-time only (no email sent)

#### 2. Fix LIVE badge to only show for actual live sessions

**File: `src/components/dashboard/conversation-list/ConversationTableRow.tsx` (~line 249-253)**

Change the LIVE badge condition from:
```
conversation.channel === 'widget' && conversation.status === 'open'
```
to:
```
conversation.channel === 'widget' && conversation.metadata?.chatSessionStatus === 'active'
```

This matches the logic already used in `ConversationListItem.tsx` (line 69-70) where the LIVE badge only shows when `metadata.chatSessionStatus === 'active'`.

**File: `supabase/functions/widget-submit/index.ts` (~line 155)**

The contact form currently does not set `chatSessionStatus` in metadata (only sets `source: 'widget'`), so with the fix above, contact form conversations will correctly NOT show the LIVE badge. No change needed here.

#### 3. Update banner text for ended chats

**File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx` (~line 173-183)**

When the visitor has left the chat, update the banner to inform the agent that further replies will be sent via email:

- Change "Visitor has left the chat" to "Visitor has left the chat -- replies will be sent via email"

This gives agents clear feedback about how their messages will be delivered.

### Summary of changes

| File | Change |
|------|--------|
| `src/contexts/ConversationViewContext.tsx` | Check active chat session before deciding to send email |
| `supabase/functions/send-reply-email/index.ts` | Replace blanket widget skip with active-session check |
| `src/components/dashboard/conversation-list/ConversationTableRow.tsx` | LIVE badge only when `metadata.chatSessionStatus === 'active'` |
| `src/components/dashboard/conversation-view/ConversationViewContent.tsx` | Banner: "replies will be sent via email" |

