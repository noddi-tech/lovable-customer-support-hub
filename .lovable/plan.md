

## Status: Code is correct — adding status selector dropdown

After thorough investigation, all three lifecycle behaviors are already coded correctly:

1. **Close on reply**: Line 164 sets `status: 'closed'` — this works
2. **Email sending**: Lines 183-190 invoke `send-reply-email` for non-live sessions — this works
3. **Reopen on customer reply**: Both `widget-chat` (line 398) and `email-webhook` (line 202) set `status: 'open', is_read: false` — this works

The issue you're seeing is likely a stale preview build. The changes from our previous session may not have been picked up yet.

**However**, per your earlier request and the approved plan, we should still add the **status selector dropdown** so you can choose between "Send and Close" vs "Send and Keep Open" (like the email view). This is the missing UX piece.

### Change: Add reply status selector to `ChatReplyInput.tsx`

1. Add `replyStatus` state defaulting to `'closed'`
2. Add a compact `Select` dropdown next to the Send button with options:
   - **Send & Close** (default) — `closed`
   - **Send & Keep Open** — `open` 
   - **Send & Pending** — `pending`
3. Replace hardcoded `status: 'closed'` on line 164 with `status: replyStatus`
4. Hide the selector when in internal note mode (notes don't change status)
5. Skip the conversation status update entirely when `replyStatus === 'open'` (no-op, already open)

### File changed

| File | Change |
|---|---|
| `src/components/conversations/ChatReplyInput.tsx` | Add `replyStatus` state + Select dropdown + dynamic status |

