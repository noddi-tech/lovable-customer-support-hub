

## Show Archived Flag in UI + Fix Filter Visibility

### Overview
Two changes: (1) show an "Archived" badge on conversations that have `is_archived = true` so users understand the state, and (2) include archived conversations in their status-based filters so they appear in both places.

### Changes

**1. `src/components/dashboard/conversation-list/ConversationListItem.tsx`**
- Add an "Archived" badge (gray, with Archive icon) next to the status badge when `conversation.is_archived` is true

**2. `src/components/dashboard/conversation-list/ConversationTableRow.tsx`**
- Same: add "Archived" badge in the status cell when `conversation.is_archived` is true

**3. SQL migration — Update `get_conversations`, `get_all_counts`, `get_inbox_counts`**
- Remove `is_archived = false` exclusion from status-based filtering/counting
- Archived conversations appear in both their status filter AND the Archived filter

**4. `src/contexts/ConversationListContext.tsx`**
- Remove `&& !conversation.is_archived` from `open`, `pending`, `assigned`, `closed`, `all` tab filters

### Result
- A closed+archived conversation shows in "Closed" with badges: `Closed` + `Archived`
- Same conversation also appears in "Archived" filter
- Users immediately see why a conversation is in a particular state

