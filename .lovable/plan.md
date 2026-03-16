

## Two Issues to Fix

### Issue 1: Action buttons need icon + text labels

The chat reply toolbar buttons (emoji, attach, internal note, translate, send, transfer, end chat) are all icon-only (`size="icon"`), making it hard to tell what each does — especially the internal note toggle.

**Fix in `ChatReplyInput.tsx`**: Change the internal note, transfer, and end chat buttons from icon-only to icon + text. Keep emoji, attach, and mic as icon-only since they're universally recognizable. The send button stays icon-only (round).

Specifically:
- Internal note toggle: `📝 Note` / `📝 Note ✓` (yellow when active)  
- Transfer: `👤 Transfer`
- End chat: `✕ End Chat`

### Issue 2: "Email not sent" false alarm — race condition

The email **was sent successfully** (edge function logs confirm SendGrid delivery, DB shows `email_status = 'sent'`). The problem is a UI race condition:

1. `ChatReplyInput` inserts the message — DB column `email_status` defaults to `'pending'`
2. The message renders immediately showing "Email not sent" (because `emailStatus === 'pending'`)
3. The `send-reply-email` edge function runs and updates status to `'sent'`
4. Query invalidation refetches, but there's a visible flash of the error state

**Fix in `ChatReplyInput.tsx`**: Explicitly set `email_status` on insert:
- For **internal notes**: set `email_status: null` (no email needed, no false warning)
- For **regular replies**: set `email_status: 'sending'` (distinct from 'pending' = not yet attempted)

**Fix in `ChatMessagesList.tsx`**: Don't show the "Email not sent" warning for `'sending'` status — only for `'failed'`, `'pending'` (legacy), or `'retry'`. Show a subtle "Sending..." indicator for `'sending'` status instead.

### Files to edit

1. **`src/components/conversations/ChatReplyInput.tsx`** — Add icon+text to action buttons; set explicit `email_status` on insert
2. **`src/components/conversations/ChatMessagesList.tsx`** — Handle `'sending'` status, don't show error for it

