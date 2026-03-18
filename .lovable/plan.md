

## Plan: Navigate to the Mentioned Message from Notification "View" Button

### Problem
When clicking "View" on a mention notification, the user lands at the conversation but not at the specific message where they were tagged. The system already supports scrolling to a message via `?m=<messageId>` — it just isn't wired up.

### Root Cause
1. The `processMentions` call doesn't include a `message_id` in the context
2. The edge function doesn't store `message_id` in the notification's `data` field
3. The notification "View" handler navigates to the conversation without `?m=` param

### Changes

**1. `src/hooks/useMentionNotifications.ts`** — Add `message_id` to `MentionContext`
- Add optional `message_id?: string` to the `MentionContext` interface

**2. `src/components/dashboard/conversation-view/ReplyArea.tsx`** — Pass message ID after insert
- The `sendReply` mutation already returns the inserted message. Update `sendReply` to return the message ID, then pass it into `processMentions`:
  ```
  processMentions(replyText, mentionedUserIds, {
    type: 'internal_note',
    conversation_id: ...,
    message_id: returnedMessageId,
  })
  ```

**3. `src/contexts/ConversationViewContext.tsx`** — Return message ID from `sendReply`
- Change `sendReply` return type from `Promise<void>` to `Promise<string | undefined>` so the caller can get the new message's ID

**4. `supabase/functions/process-mention-notifications/index.ts`** — Store `message_id` in notification data
- Read `context.message_id` and include it in the notification's `data` object

**5. `src/pages/NotificationsPage.tsx`** — Navigate with message param
- Update `handleNavigate` to include `&m=<message_id>` when `data.message_id` exists:
  ```
  navigate(`/interactions/text/open?c=${data.conversation_id}&m=${data.message_id}`)
  ```

**6. `src/hooks/useRealtimeNotifications.tsx`** — Update toast action URL
- Include `&m=` in the toast's "View" action URL when `data.message_id` exists

**7. Other callers** (`TicketCommentsList.tsx`, `CustomerNotes.tsx`)
- These mention types (ticket_comment, customer_note) don't navigate to messages, so no changes needed

### Files changed

| File | Change |
|---|---|
| `src/hooks/useMentionNotifications.ts` | Add `message_id` to `MentionContext` |
| `src/contexts/ConversationViewContext.tsx` | Return message ID from `sendReply` |
| `src/components/dashboard/conversation-view/ReplyArea.tsx` | Pass `message_id` to `processMentions` |
| `supabase/functions/process-mention-notifications/index.ts` | Store `message_id` in notification data |
| `src/pages/NotificationsPage.tsx` | Navigate with `&m=` param |
| `src/hooks/useRealtimeNotifications.tsx` | Include `message_id` in toast action URL |

