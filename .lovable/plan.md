

## Plan: Three Changes — CC Preview, Reply All Testing, and Chat Mentions

### 1. Show CC Recipients Preview in Reply Area

**Problem**: Agents can't see who will receive the email before sending. The CC recipients are only resolved server-side in `send-reply-email`.

**Solution**: Extract CC addresses from conversation message `email_headers` on the client side and display them above the textarea when "Reply All" is selected.

**Changes in `src/components/dashboard/conversation-view/ReplyArea.tsx`**:
- Add a `useMemo` that scans `messages` for CC headers (same logic as the edge function's `extractCcRecipients` but client-side) — extract unique CC emails excluding the customer and inbox email
- When `replyAll` is true and CC recipients exist, render a small info bar below the Reply/Reply All toggle showing "CC: alice@example.com, bob@example.com"
- When `replyAll` is false, hide the CC bar
- Style it as a subtle `text-xs text-muted-foreground` line with a `Users` icon

### 2. Chat Internal Notes: Add @mention Support

**Problem**: `ChatReplyInput` uses a plain `<Textarea>` even in internal note mode, unlike the email `ReplyArea` which swaps in `<MentionTextarea>`. Mentions don't work in chat notes.

**Solution**: Mirror the email ReplyArea's pattern — swap the textarea for `MentionTextarea` when `isInternalNote` is true, and process mentions on send.

**Changes in `src/components/conversations/ChatReplyInput.tsx`**:
- Import `MentionTextarea` and `useMentionNotifications`
- Add `mentionedUserIds` state
- When `isInternalNote`, render `MentionTextarea` instead of plain `Textarea` (same pattern as ReplyArea lines 517-532)
- In `sendMessageMutation.onSuccess` (or after insert), call `processMentions` with `{ type: 'internal_note', conversation_id, message_id }` when mentionedUserIds is non-empty and isInternalNote
- Update the `handleInputChange` to work with the MentionTextarea's `onChange(value, mentions)` signature

### Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/conversation-view/ReplyArea.tsx` | Add CC recipients preview bar |
| `src/components/conversations/ChatReplyInput.tsx` | Swap to MentionTextarea in note mode + process mentions on send |

### Note on Testing (item 2)
Testing Reply vs Reply All is a manual QA task — it requires sending actual emails. The CC preview (item 1) will make it easy to verify visually which recipients will be included before sending.

