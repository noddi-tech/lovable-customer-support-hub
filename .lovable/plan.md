
Fix the archived indicator at the data source, not just the JSX.

### Root cause
The archived badges are already present in the chat and email detail UI, but `ConversationView` renders data from `useConversationMeta`, and that hook does not fetch or return `is_archived`.

So the UI is effectively doing:
```ts
if (conversation.is_archived) { ... }
```
but `conversation.is_archived` is `undefined` in the detail view payload.

There is also a second bug: when archive status is changed from the detail view, `ConversationViewContext.updateStatus()` only updates the full `['conversation', ...]` cache, while the visible detail UI uses `['conversation-meta', ...]`. That means the archived badge can stay stale even after archiving/unarchiving.

### Bulletproof fix

#### 1. Update `src/hooks/conversations/useConversationMeta.ts`
Extend the `ConversationMeta` type and query so it includes archived state.

- Add `isArchived: boolean`
- Select `is_archived` from `conversations`
- Map `conversation.is_archived` into the returned object

Implementation shape:
```ts
interface ConversationMeta {
  ...
  isArchived: boolean;
}
```

Query:
```ts
.select(`
  id,
  subject,
  status,
  priority,
  is_read,
  is_archived,
  created_at,
  updated_at,
  channel,
  customer:customers(...)
`)
```

Return mapping:
```ts
isArchived: !!conversation.is_archived
```

#### 2. Normalize the prop shape used by detail components
Right now the detail UI checks `conversation.is_archived`, while `useConversationMeta` returns camelCase fields like `isRead`, `createdAt`, `lastUpdated`.

To avoid more silent mismatches, align this explicitly in one of two ways:

Preferred:
- In `ConversationView.tsx`, pass a normalized conversation object to `ConversationViewContent`:
```ts
{
  ...conversation,
  is_archived: conversation.isArchived
}
```

Better long-term alternative:
- Update `useConversationMeta` to expose both:
```ts
isArchived: boolean;
is_archived: boolean;
```
This is slightly redundant, but safest for the current mixed codebase because many components still read snake_case.

Given this codebase, the safest fix is to return both fields for now.

#### 3. Update `src/contexts/ConversationViewContext.tsx`
Make `updateStatus` keep the meta cache in sync too.

Inside `updateStatusMutation.onSuccess`, after updating:
```ts
['conversation', conversationId, user?.id]
```
also update:
```ts
['conversation-meta', conversationId, user?.id]
```

Map correctly:
- `status` → `status`
- `isArchived` → both `is_archived` and `isArchived`

This prevents the badge from disappearing or lagging after archive/unarchive actions in the detail view.

#### 4. Keep the existing UI badges, but verify all render paths use the same field
The JSX for archived is already present in:
- `ConversationViewContent.tsx` chat header
- `ConversationViewContent.tsx` email header
- `CustomerSidePanel.tsx`

Review those checks and make them resilient to the mixed shape:
```ts
const isArchived = conversation.is_archived ?? conversation.isArchived;
```

Then render from that local boolean in:
- chat header
- email header
- side panel “Conversation” section

This avoids future regressions if different fetch paths supply camelCase vs snake_case.

### Files to update
- `src/hooks/conversations/useConversationMeta.ts`
- `src/components/dashboard/ConversationView.tsx`
- `src/contexts/ConversationViewContext.tsx`
- `src/components/dashboard/conversation-view/ConversationViewContent.tsx`
- `src/components/dashboard/conversation-view/CustomerSidePanel.tsx`

### Expected result
After this fix:

- Archived email conversations show an `Archived` badge in the detail header
- Archived chat conversations show an `Archived` badge in the chat header
- The side panel also shows archived state
- Archive/unarchive updates appear immediately without needing a hard refresh
- The detail view stays consistent with the list view

### Why this fixes the screenshots
Your screenshots show the list correctly knows the conversation is archived, while the open detail view does not. That means the problem is not styling or placement anymore — it is that the detail-view data payload is missing the archived flag. This plan fixes that exact data mismatch and the stale-cache path too.
