# Hide the "New" label on closed conversations

In the closed list view, threads still show the blue "New" badge because the badge only checks `is_read`, never the conversation status. Closing a thread is a form of handling it, so it should not still look unread.

## Change

- The "New" badge is hidden when a conversation's status is `closed` (or the thread is archived), in all three row layouts: mobile card, compact row, and the desktop table row.
- Open and pending conversations keep the badge exactly as today.
- No change to the underlying read state or to unread counts.

## Technical details

`src/components/dashboard/conversation-list/ConversationTableRow.tsx` — add a single derived flag (e.g. `showNewBadge = !conversation.is_read && conversation.status !== 'closed' && !conversation.is_archived`) and use it in place of `!conversation.is_read` at the three "New" badge sites (lines ~321, ~406, ~562).
