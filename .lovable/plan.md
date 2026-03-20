

## Fix: Header Identity & "To:" Line Placement

### Issue 1: Header still shows "Dekkfix · hei@dekkfix.no"

The database is already correct (`Amanuel Tekber · amanueltekber@gmail.com`). The header code at line 322 reads `conversation.customer?.full_name` directly. This is a **React Query cache** issue — the `staleTime` is 60 seconds, and since the customer_id was changed via migration, the old cached result persists until invalidated.

**Fix**: No code change needed for the logic itself — it's already correct. But to force immediate freshness, reduce `staleTime` for conversation-meta to 0 after a migration, or simply do a hard refresh. However, if the user is seeing this persistently, there may be a secondary issue: the `InteractionsLayout.tsx` parent also fetches conversation data independently and may be rendering the header from its own stale query.

**Action**: Check `InteractionsLayout.tsx` for a duplicate conversation fetch that might be passing stale customer data. If found, ensure it also uses the `useConversationMeta` result.

### Issue 2: "To:" on its own line

Currently, the "To:" row is a **separate div** (line 428) rendered below the header metadata row (lines 356-417). The user wants "To: hei@dekkfix.no" to appear **inline** on the same line as the date, agent badge, and avatar — not as a separate row.

**Fix in `src/components/conversations/MessageCard.tsx`**:

Move the "To:" recipients **inside** the existing header flex row (the `flex items-center` div at line 356). Place them after the author badge and before the "New" badge. This makes them part of the same flex line, appearing inline with the timestamp and author.

- Remove the separate recipients `div` (lines 428-490)
- Add a compact inline "To: email" inside the header flex row (after the author badge)
- For expanded view: show as `To: email` text (not badges — too wide for inline)
- For collapsed view: don't show recipients (already hidden)

### Changes

| File | Change |
|------|--------|
| `MessageCard.tsx` | Move "To:" inline into the header metadata row; remove separate recipients div |
| `ConversationViewContent.tsx` or `InteractionsLayout.tsx` | Verify no stale duplicate query is overriding the customer identity |

