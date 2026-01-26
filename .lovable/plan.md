

## Plan: Fix Deleted Filter in Text Messages

### Problem Summary
When you delete a conversation in the text messages inbox, it correctly performs a soft-delete (sets `deleted_at` timestamp), but the conversation does not appear in the "Deleted" filter view. The issue is in the `ConversationListContext.tsx` which:

1. Uses the wrong RPC function (`get_conversations` instead of `get_conversations_with_session_recovery`)
2. Missing `is_deleted` field in the `Conversation` interface
3. Missing `case "deleted"` in the filter logic (appears in 2 places)
4. All other filters don't explicitly exclude deleted items

### Changes Required

#### File: `src/contexts/ConversationListContext.tsx`

**Change 1: Update Conversation Interface (lines 32-54)**
Add the missing field:
```typescript
export interface Conversation {
  // ... existing fields
  is_archived?: boolean;
  is_deleted?: boolean;  // ADD THIS
  channel: ConversationChannel;
  // ... rest of fields
}
```

**Change 2: Switch to Correct RPC (lines 203-218)**
Replace `get_conversations` with `get_conversations_with_session_recovery`:
```typescript
queryFn: async ({ pageParam = 0 }) => {
  logger.info('Fetching conversations page', { 
    userId: user?.id, 
    offset: pageParam,
    inbox: selectedInboxId,
    status: selectedTab 
  }, 'ConversationListProvider');
  
  // Determine if we should fetch deleted conversations
  const includeDeleted = selectedTab === 'deleted';
  
  const { data, error } = await supabase.rpc('get_conversations_with_session_recovery', {
    inbox_uuid: (selectedInboxId && selectedInboxId !== 'all') ? selectedInboxId : null,
    include_deleted: includeDeleted
  });
  
  // ... rest of logic
  
  const conversations = (data || []).map((conv: any) => ({
    ...conv,
    is_deleted: conv.is_deleted || false,  // Map the field
    customer: conv.customer_id ? {
      id: conv.customer_id,
      full_name: conv.customer_name || conv.customer_email || 'Unknown',
      email: conv.customer_email || ''
    } : conv.customer,  // Use jsonb object from RPC if available
    assigned_to: conv.assigned_to_id ? {
      id: conv.assigned_to_id,
      full_name: conv.assigned_to_name || 'Unassigned'
    } : conv.assigned_to,  // Use jsonb object from RPC if available
  })) as Conversation[];
```

**Change 3: Add Deleted Case in markAllAsRead Filter (lines 357-389)**
```typescript
const matchesTab = (() => {
  const isSnoozedActive = !!conversation.snooze_until && new Date(conversation.snooze_until) > new Date();
  switch (selectedTab) {
    case "snoozed":
      return isSnoozedActive;
    case "all":
      return conversation.status !== 'closed' && !isSnoozedActive && !conversation.is_deleted;
    case "unread":
      return !conversation.is_read && !isSnoozedActive && !conversation.is_deleted;
    case "assigned":
      return !!conversation.assigned_to && !isSnoozedActive && !conversation.is_deleted;
    case "pending":
      return conversation.status === 'pending' && !isSnoozedActive && !conversation.is_deleted;
    case "closed":
      return conversation.status === 'closed' && !isSnoozedActive && !conversation.is_deleted;
    case "archived":
      return conversation.is_archived === true && !conversation.is_deleted;
    case "deleted":  // ADD THIS CASE
      return conversation.is_deleted === true;
    case "email":
      return conversation.channel === "email" && !isSnoozedActive && !conversation.is_deleted;
    case "facebook":
      return conversation.channel === "facebook" && !isSnoozedActive && !conversation.is_deleted;
    case "instagram":
      return conversation.channel === "instagram" && !isSnoozedActive && !conversation.is_deleted;
    case "whatsapp":
      return conversation.channel === "whatsapp" && !isSnoozedActive && !conversation.is_deleted;
    default:
      if (selectedTab.startsWith('inbox-')) {
        const inboxId = selectedTab.replace('inbox-', '');
        return conversation.inbox_id === inboxId && !isSnoozedActive && !conversation.is_deleted;
      }
      return !isSnoozedActive && !conversation.is_deleted;
  }
})();
```

**Change 4: Add Deleted Case in Main Filter (lines 492-527)**
Apply the exact same changes to the `matchesTab` switch statement in the `filteredAndSortedConversations` useMemo block.

### Why This Works

1. **Correct RPC**: `get_conversations_with_session_recovery` supports the `include_deleted` parameter and returns the `is_deleted` field
2. **Explicit Deleted Case**: When `selectedTab === 'deleted'`, only show conversations where `is_deleted === true`
3. **Exclude from Other Views**: All other filters now check `!conversation.is_deleted` to prevent deleted items from appearing in active views

### Testing Steps

1. Navigate to `/interactions/text/open`
2. Select a conversation and click Delete
3. Navigate to `/interactions/text/deleted`
4. Verify the deleted conversation appears in the Deleted view
5. Navigate back to `/interactions/text/open`
6. Verify the deleted conversation does NOT appear in Open view
7. Test other filters (Pending, Assigned, Closed) to ensure deleted items don't appear

