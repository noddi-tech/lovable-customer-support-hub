
## Plan: Fix All Filter Logic in Text Messages

### Root Cause Analysis

The filter logic is broken because the **"open" case is missing** from the switch statement in `ConversationListContext.tsx`. This causes the Open filter to fall through to the `default` case, which shows ALL non-deleted, non-snoozed conversations regardless of their status.

Additionally, the "archived" filter has issues - it only checks `is_archived === true` but doesn't exclude conversations that might also be "closed" or "open" status, and the "all" filter has special inbox logic that overrides the expected behavior.

### Current vs Expected Behavior

| Filter | Current Behavior | Expected Behavior |
|--------|------------------|-------------------|
| **Open** | Shows ALL statuses (falls to default) | Only `status === 'open'`, not archived, not deleted |
| **Pending** | Correct | `status === 'pending'`, not deleted |
| **Assigned to Me** | Shows any assigned regardless of status | Assigned to current user, not archived, not deleted |
| **Closed** | Correct | `status === 'closed'`, not archived, not deleted |
| **Archived** | Shows all archived regardless of status | `is_archived === true`, not deleted |
| **Deleted** | Empty (RPC works but data issue) | `deleted_at IS NOT NULL` |
| **All Messages** | Excludes closed unless specific inbox | All non-archived, non-deleted conversations |

### Fixes Required

#### File: `src/contexts/ConversationListContext.tsx`

**Fix 1: Add missing `case "open":` in both switch statements**

Add the Open filter logic that matches:
- `status === 'open'`
- `!is_archived` (not archived)
- `!is_deleted` (not deleted)
- `!isSnoozedActive` (not snoozed)

**Fix 2: Update "archived" filter to be clearer**

The archived filter should:
- Show conversations where `is_archived === true`
- Not show deleted items

**Fix 3: Update "all" (All Messages) filter**

All Messages should show:
- All conversations that are not archived and not deleted
- Regardless of status (open, pending, closed)

**Fix 4: Ensure "closed" excludes archived items**

Closed should only show:
- `status === 'closed'`
- `!is_archived` (if it's closed AND archived, it should only show in Archived)
- `!is_deleted`

### Complete Filter Logic (Both Switch Statements)

```typescript
switch (selectedTab) {
  case "open":
    // Open: status is 'open', not archived, not snoozed, not deleted
    return conversation.status === 'open' 
      && !conversation.is_archived 
      && !isSnoozedActive 
      && !conversation.is_deleted;
      
  case "pending":
    // Pending: status is 'pending', not archived, not snoozed, not deleted
    return conversation.status === 'pending' 
      && !conversation.is_archived 
      && !isSnoozedActive 
      && !conversation.is_deleted;
      
  case "assigned":
    // Assigned to Me: has assignment, not archived, not snoozed, not deleted
    return !!conversation.assigned_to 
      && !conversation.is_archived 
      && !isSnoozedActive 
      && !conversation.is_deleted;
      
  case "closed":
    // Closed: status is 'closed', not archived, not snoozed, not deleted
    return conversation.status === 'closed' 
      && !conversation.is_archived 
      && !isSnoozedActive 
      && !conversation.is_deleted;
      
  case "archived":
    // Archived: is_archived flag is true, not deleted
    return conversation.is_archived === true 
      && !conversation.is_deleted;
      
  case "deleted":
    // Deleted: deleted_at is set (is_deleted flag)
    return conversation.is_deleted === true;
    
  case "snoozed":
    // Snoozed: has active snooze, not deleted
    return isSnoozedActive 
      && !conversation.is_deleted;
      
  case "all":
    // All Messages: everything that's not archived and not deleted
    return !conversation.is_archived 
      && !isSnoozedActive 
      && !conversation.is_deleted;
      
  // Channel filters
  case "email":
  case "facebook":
  case "instagram":
  case "whatsapp":
    return conversation.channel === selectedTab 
      && !conversation.is_archived 
      && !isSnoozedActive 
      && !conversation.is_deleted;
      
  default:
    // Inbox-specific filter
    if (selectedTab.startsWith('inbox-')) {
      const inboxId = selectedTab.replace('inbox-', '');
      return conversation.inbox_id === inboxId 
        && !conversation.is_archived 
        && !isSnoozedActive 
        && !conversation.is_deleted;
    }
    // Fallback: show non-archived, non-snoozed, non-deleted
    return !conversation.is_archived 
      && !isSnoozedActive 
      && !conversation.is_deleted;
}
```

### Technical Details

This logic must be updated in **two locations** within `ConversationListContext.tsx`:

1. **Lines 360-391**: Inside `markAllAsReadMutation` filter
2. **Lines 495-531**: Inside `filteredAndSortedConversations` useMemo

Both switches must have identical logic to ensure consistent behavior.

### Filter Definitions Summary

| Filter | Database Fields | Logic |
|--------|-----------------|-------|
| **Open** | `status='open'`, `is_archived=false`, `deleted_at=NULL` | Active work items requiring attention |
| **Pending** | `status='pending'`, `is_archived=false`, `deleted_at=NULL` | Awaiting customer response |
| **Assigned** | `assigned_to_id IS NOT NULL`, `is_archived=false`, `deleted_at=NULL` | Assigned to current user |
| **Closed** | `status='closed'`, `is_archived=false`, `deleted_at=NULL` | Resolved but not archived |
| **Archived** | `is_archived=true`, `deleted_at=NULL` | Stored for reference |
| **Deleted** | `deleted_at IS NOT NULL` | Soft-deleted, recoverable |
| **All Messages** | `is_archived=false`, `deleted_at=NULL` | All active conversations (any status) |

### Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/ConversationListContext.tsx` | Add `case "open":` and fix all filter cases in both switch statements (lines 360-391 and 495-531) |

### Expected Results After Fix

- **Open (12)**: Only shows conversations with `status='open'`
- **Pending (4)**: Only shows conversations with `status='pending'`
- **Assigned (1)**: Only shows conversations assigned to current user
- **Closed (6178)**: Only shows conversations with `status='closed'`
- **Archived (8)**: Only shows archived conversations (any status)
- **Deleted (0)**: Shows soft-deleted conversations
- **All Messages (6194)**: Shows all non-archived, non-deleted conversations
