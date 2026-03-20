
Root cause is now clear: the SQL fix you approved updated `get_conversations`, but this screen does not use that RPC for the list.

What’s actually happening:
- Sidebar count: comes from the count RPCs, which now include archived closed conversations
- Conversation list: comes from `get_conversations_with_session_recovery(...)`
- Then `ConversationListContext.tsx` filters the fetched rows again in the browser
- In that client-side filter, the `closed` branch still has `&& !conversation.is_archived`, so all 8 closed+archived conversations are removed before rendering

Why you see “8” + “No conversations found”
- DB says there are 8 closed conversations in Dekkfix
- All 8 are archived
- The list fetch gets them
- Frontend throws them away because `selectedTab === "closed"` still excludes archived rows

Files to update
1. `src/contexts/ConversationListContext.tsx`
- Remove `!conversation.is_archived` from the client-side tab filters for:
  - `open`
  - `pending`
  - `assigned`
  - `closed`
  - `all`
  - `unread`
- Keep `archived` as `conversation.is_archived === true`
- Keep channel/inbox-specific behavior only if intentionally exclusive, otherwise align those too

2. Same file, in both filtering blocks
- There are two separate tab-filter implementations in this file:
  - one inside `markAllAsReadMutation`
  - one inside `filteredAndSortedConversations`
- They currently disagree with the new archived behavior
- Update both so behavior is consistent everywhere

Recommended exact behavior
- Closed tab: show all `status === 'closed'` and not deleted/snoozed, regardless of archived
- Archived tab: show all `is_archived === true` and not deleted
- Result: a closed+archived conversation appears in both tabs, with the Archived badge explaining why

Why the last migration appeared to “do nothing”
- It changed `public.get_conversations(...)`
- But this view fetches with `public.get_conversations_with_session_recovery(...)`
- So the visible bug is now 100% in frontend filtering, not the count query

Validation after implementation
- Dekkfix > Closed should show the 8 rows
- Each row should show both badges: `Closed` + `Archived`
- Dekkfix > Archived should still show the same archived rows
- “No conversations found” should disappear in Closed

Technical detail
Relevant lines already inspected:
- `useInfiniteQuery(...)` fetches `get_conversations_with_session_recovery` in `ConversationListContext.tsx`
- `filteredAndSortedConversations` still excludes archived for `closed` at the `case "closed"` branch
- `markAllAsReadMutation` has a second filter block that should be updated too, otherwise bulk actions will still behave inconsistently

This is a smaller frontend follow-up fix, not another database issue.
