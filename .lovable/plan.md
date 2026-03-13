

## Plan: Fix Counter Mismatch + Add Internal Notes to Chat

### Bug 1: Open counter shows 9 but only 6 rows visible

**Root cause**: The SQL `get_inbox_counts` / `get_all_counts` functions count every individual conversation with `status='open'`. But the conversation list applies **client-side threading** (`groupConversationsByThread`) which groups conversations from the same customer+subject into a single row. If 3 pairs of conversations get threaded together, you see 6 rows but the counter shows 9.

The SQL knows nothing about threading. The counter and the list count different things.

**Fix (Hybrid approach)**: After the `ConversationListContext` computes `filteredAndSortedConversations` (which includes threading), expose these counts so the sidebar can use them for the **active** filter. For non-active filters, continue using SQL counts (they're approximate but acceptable as indicators).

**Changes:**

1. **`src/contexts/ConversationListContext.tsx`** — After `filteredAndSortedConversations` is computed, derive a `threadedOpenCount` (the actual number of visible rows for the current tab). Expose this via context as `visibleCount`.

2. **`src/components/layout/InboxList.tsx`** — Accept an optional `visibleCount` prop for the currently active filter. When provided, display it instead of the SQL count for that specific filter button. Other filters keep using SQL counts.

3. **`src/components/dashboard/EnhancedInteractionsLayout.tsx`** — Pass the `visibleCount` from the conversation list context down to `InboxList` for the active status tab.

Alternatively (simpler, no cross-context wiring): **Do the threading-aware counting in SQL**. Add a `COUNT(DISTINCT ...)` with a thread key (lower(customer_email) || '::' || lower(regexp_replace(subject, ...))). This keeps the count logic centralized and always correct.

**Recommended approach**: SQL-level fix. Add a thread-aware count column to `get_all_counts` and `get_inbox_counts` that groups by `(customer_email, normalized_subject)` before counting, matching the client-side threading logic:

```sql
-- Replace simple COUNT with thread-aware count
-- Thread key = customer email + normalized subject (matching client logic)
WITH threaded AS (
  SELECT DISTINCT ON (
    LOWER(COALESCE(cu.email, '')),
    LOWER(REGEXP_REPLACE(c.subject, '^(re:|fwd?:|fw:|aw:|sv:|vs:)\s*', '', 'gi'))
  )
  c.id, c.status, c.is_archived, c.is_read, c.deleted_at, 
  c.snooze_until, c.assigned_to_id, c.channel
  FROM conversations c
  LEFT JOIN customers cu ON c.customer_id = cu.id
  WHERE c.organization_id = v_org_id
  ORDER BY LOWER(COALESCE(cu.email, '')),
    LOWER(REGEXP_REPLACE(c.subject, '^(re:|fwd?:|fw:|aw:|sv:|vs:)\s*', '', 'gi')),
    COALESCE(c.received_at, c.updated_at) DESC
)
SELECT
  COUNT(*) FILTER (WHERE status='open' AND deleted_at IS NULL 
    AND NOT is_archived AND (snooze_until IS NULL OR snooze_until <= NOW()))
  AS conversations_open,
  -- ... other counts ...
FROM threaded;
```

This applies the same deduplication the client does: for each (customer_email, normalized_subject) group, only the most recent conversation is counted. The counter will then match the visible rows exactly.

**Migration**: New SQL migration updating both `get_all_counts()` and `get_inbox_counts(uuid)`.

---

### Feature 2: Add internal notes to live chat

**Current state**: The live chat view uses `ChatReplyInput` (line 377 of `ProgressiveMessagesList.tsx`) which is a dedicated chat composer that **hardcodes `is_internal: false`** on every message insert. It has no internal note toggle or button.

Meanwhile, the email view uses `LazyReplyArea` → `ReplyArea` which has full internal note support (toggle, yellow styling, mention support).

**Fix**: Add an "Internal Note" button to `ChatReplyInput`, matching the email pattern:

1. **`src/components/conversations/ChatReplyInput.tsx`**:
   - Add `isInternalNote` state toggle
   - Add a sticky note icon button next to Send that toggles note mode
   - When in note mode: change textarea background to yellow tint, show "Internal note" badge, set `is_internal: true` on the message insert
   - Internal notes skip the typing indicator (`handleTyping`) since they're not visible to the visitor
   - Add keyboard shortcut: `N` key to toggle note mode when textarea is not focused

2. **`src/components/conversations/ChatMessagesList.tsx`** — Ensure internal notes render with the yellow note styling (they already flow through `MessageCard` which handles `isInternalNote` styling, but verify the chat message list passes the flag correctly).

### Files changed

| File | Change |
|---|---|
| New SQL migration | Thread-aware counting in `get_all_counts` and `get_inbox_counts` |
| `src/components/conversations/ChatReplyInput.tsx` | Add internal note toggle, button, and yellow styling |

