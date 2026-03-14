

## Three Issues — Root Causes and Fixes

### Issue 1: Replies to widget/contact form don't send email

**Root cause**: The chat-style UI uses `ChatReplyInput.tsx` which has its **own** `sendMessageMutation` that directly inserts into the `messages` table. It never calls `send-reply-email`. The email-sending logic only exists in `ConversationViewContext.sendReply()`, which is used by the email-style `ReplyArea` but not by `ChatReplyInput`.

**Fix**: After successful message insert in `ChatReplyInput.sendMessageMutation`, add the same email-sending logic from `ConversationViewContext`: check if there's an active live chat session with recent heartbeat. If not (contact form, ended chat, abandoned), call `send-reply-email` with the new message ID. Skip for internal notes.

### Issue 2: Delete should only work for unsent messages

**Root cause**: In `ChatMessagesList`, delete is a TODO stub (`toast.info('Delete functionality coming soon')`). In the email view (`MessagesList`), delete opens a dialog but has no restriction on which messages can be deleted.

**Fix**:
- Implement actual delete in `ChatMessagesList`: call `supabase.from('messages').delete().eq('id', messageId)` and invalidate caches.
- Only show the delete option on messages where `email_status` is `failed`, `pending`, or `retry` (i.e., unsent). Hide the delete menu item for successfully sent or inbound messages.
- Apply the same visibility rule in the email-view `MessageCard` dropdown.

### Issue 3: Chat replies don't close the conversation

**Root cause**: `ChatReplyInput.sendMessageMutation` only inserts the message — it never updates `conversations.status`. The email `ReplyArea` passes `replyStatus` (defaulting to `'closed'`) to `sendReply`, which updates the conversation status. Chat input completely skips this.

**Fix**: After successful message insert in `ChatReplyInput` (for non-internal messages), update the conversation status to `'closed'` and `is_read: true` — matching the email flow. Also invalidate conversation list caches (`conversations`, `all-counts`, `inboxCounts`) so the conversation moves out of Open.

### Files to edit

1. **`src/components/conversations/ChatReplyInput.tsx`** — Add email sending + status update to `sendMessageMutation.mutationFn`. Invalidate count caches in `onSuccess`.
2. **`src/components/conversations/ChatMessagesList.tsx`** — Implement `handleDeleteMessage` with actual DB delete. Conditionally show delete button only for unsent agent messages.
3. **`src/components/conversations/MessageCard.tsx`** — Conditionally show delete menu item only for unsent agent messages (check `email_status`).

### Technical detail

```text
ChatReplyInput.sendMessageMutation (after insert succeeds):
  1. if (!isInternalNote) → update conversations set status='closed', is_read=true
  2. if (!isInternalNote) → check widget_chat_sessions for active session
     - if NOT actively live → invoke send-reply-email({ messageId })
  3. onSuccess: invalidate all-counts, inboxCounts, conversations

Delete visibility rule:
  Show delete only when:
    message.sender_type === 'agent' AND
    message.email_status IN ('failed', 'pending', 'retry', null-but-no-delivery)
```

