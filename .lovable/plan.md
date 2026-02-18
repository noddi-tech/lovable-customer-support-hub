
# Fix: Deleted Conversations Not Appearing + Stale Counts

## What Happened

The 2 conversations you deleted earlier were **permanently removed** before the soft-delete fix was applied. Unfortunately, those cannot be recovered. Going forward, the soft-delete fix will work -- but there are additional issues to fix.

## Problems Found

### 1. Bulk delete still does hard DELETE
The bulk delete function in `ConversationListContext.tsx` (used by the bulk actions bar) still permanently deletes messages and conversations instead of soft-deleting them.

### 2. Missing cache invalidation after soft-delete
When a conversation is soft-deleted from the detail view, the code doesn't invalidate React Query caches. This means the sidebar counts and conversation list stay stale until the next automatic refresh.

### 3. Row-level delete action also hard-deletes
The per-row delete action in `ConversationTableRow.tsx` (via the conversation list context's `deleteConversation` dispatcher) also needs to be checked for soft-delete compliance.

## Fixes

### File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx`
**Add cache invalidation after soft-delete** (around line 583):
- After the successful soft-delete update, add:
  - `queryClient.invalidateQueries({ queryKey: ['conversations'] })`
  - `queryClient.invalidateQueries({ queryKey: ['inboxCounts'] })`
  - `queryClient.invalidateQueries({ queryKey: ['all-counts'] })`
- Import `useQueryClient` from `@tanstack/react-query`

### File: `src/contexts/ConversationListContext.tsx`
**Change bulk delete from hard-delete to soft-delete** (lines 828-866):
- Replace the message hard-delete + conversation hard-delete with a single soft-delete update:
  ```
  supabase
    .from('conversations')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', chunk)
  ```
- Remove the message deletion step (messages stay linked to the soft-deleted conversation)
- Add count cache invalidation (`inboxCounts`, `all-counts`)

## Technical Summary

| Location | Current Behavior | Fixed Behavior |
|---|---|---|
| ConversationViewContent delete button | Soft-deletes but no cache refresh | Soft-deletes + invalidates all caches |
| ConversationListContext bulkDelete | Hard-deletes messages and conversations | Soft-deletes conversations only |
