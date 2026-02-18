

# Fix: Deleted conversations not appearing in "Deleted" filter

## Problem

When you delete a conversation, it's being **permanently removed** from the database instead of being soft-deleted. That's why the "Deleted" filter always shows 0 -- the conversations no longer exist at all.

## Root Cause

The delete button in the conversation detail view (`ConversationViewContent.tsx`, line 575) uses a **hard DELETE**:
```
supabase.from('conversations').delete().eq('id', conversationId)
```

This permanently removes the row instead of setting the `deleted_at` timestamp (soft delete), which is what the "Deleted" filter looks for.

The same issue exists in several other files:
- `ConversationCleanup.tsx` (admin tool -- may be intentionally permanent)
- `DeleteAllButton.tsx` (admin tool -- may be intentionally permanent)
- `ThreadMerger.tsx` (merges duplicates -- intentionally permanent)
- `InboxManagement.tsx` (bulk inbox deletion -- intentionally permanent)

## Fix

**File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx`** (lines 574-587)

Change the hard delete to a soft delete by replacing `.delete()` with `.update({ deleted_at: new Date().toISOString() })`:

```typescript
const { error } = await supabase
  .from('conversations')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', conversationId);

if (error) {
  toast.error('Failed to delete conversation');
} else {
  toast.success('Conversation moved to trash');
  // ... existing URL cleanup
}
```

Also update the dialog description text from "permanently delete" to "move to trash", since soft-deleted conversations can be recovered.

The admin tools (ConversationCleanup, DeleteAllButton, InboxManagement, ThreadMerger) will be left as hard deletes since they serve administrative/cleanup purposes.

