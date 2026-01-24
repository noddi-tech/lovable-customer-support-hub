

## Fix Internal Notes: Author Attribution & 30-Second Delay

### Problem Summary
Two issues with internal notes:
1. **30-second delay** before notes appear after creation
2. **Wrong author** - shows "hei@noddi.no" with "H" avatar instead of the actual agent (Joachim)

### Root Cause
1. **Missing `sender_id`**: The note insertion at `ConversationViewContext.tsx:300-308` does NOT include `sender_id: user.id`, so the database stores NULL
2. **Fallback to inbox email**: Without `sender_id`, `normalizeMessage.ts:385` falls back to `ctx.inboxEmail` ("hei@noddi.no")
3. **Cache invalidation mismatch**: Real-time invalidates `['thread-messages']` but the actual query key includes conversation IDs and user ID

---

### Fix 1: Set `sender_id` When Creating Notes

**File:** `src/contexts/ConversationViewContext.tsx`

**Location:** Lines 300-310

```typescript
// Before (missing sender_id)
const { data: message, error: insertError } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    content,
    sender_type: 'agent',
    is_internal: isInternal,
    content_type: 'text/plain'
  })

// After (with sender_id)
const { data: message, error: insertError } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    content,
    sender_type: 'agent',
    sender_id: user.id,  // Add the current user's ID
    is_internal: isInternal,
    content_type: 'text/plain'
  })
```

---

### Fix 2: Improve Real-time Cache Invalidation

**File:** `src/contexts/ConversationViewContext.tsx`

**Location:** Lines 252-257

```typescript
// Before (too broad, doesn't match exact query key)
queryClient.invalidateQueries({ 
  queryKey: ['thread-messages'] 
});

// After (invalidate with exact conversation ID for faster cache bust)
queryClient.invalidateQueries({ 
  queryKey: ['thread-messages'],
  exact: false  // Invalidate all thread-messages queries
});
// Force immediate refetch for current conversation
queryClient.refetchQueries({
  queryKey: ['thread-messages'],
  predicate: (query) => {
    const key = query.queryKey as string[];
    return key[0] === 'thread-messages' && key.includes(conversationId);
  }
});
```

Alternatively, use `refetchQueries` directly after mutation success.

---

### Fix 3: Immediate Optimistic Update on Mutation Success

**File:** `src/contexts/ConversationViewContext.tsx`

Add to the `sendReplyMutation.onSuccess` callback:

```typescript
onSuccess: () => {
  // Force immediate refetch instead of waiting for stale timeout
  queryClient.refetchQueries({
    queryKey: ['thread-messages'],
    exact: false
  });
}
```

---

### Fix 4: Resolve Agent Profile in normalizeMessage

**File:** `src/lib/normalizeMessage.ts`

When `sender_id` is present and `sender_type` is 'agent', look up the agent's profile from the context or a cached lookup:

```typescript
// Around line 383-387, improve agent fallback
if (authorType === 'agent') {
  // If we have sender_id, try to get agent info from context
  const agentId = rawMessage.sender_id;
  if (agentId && ctx.agentProfiles?.[agentId]) {
    const agent = ctx.agentProfiles[agentId];
    fromName = agent.full_name;
    fromEmail = agent.email;
    authorLabel = agent.full_name || agent.email;
  } else {
    // Fallback to inbox email only if no sender_id
    fromEmail = fromEmail ?? ctx.inboxEmail?.toLowerCase() ?? ctx.currentUserEmail?.toLowerCase();
    authorLabel = fromEmail || 'Agent';
  }
}
```

---

### Fix 5: Backfill Existing Notes (One-time SQL)

Run this SQL to fix existing notes that are missing `sender_id`:

```sql
-- First, check how many notes need fixing
SELECT COUNT(*) FROM messages 
WHERE is_internal = true 
  AND sender_id IS NULL 
  AND sender_type = 'agent';

-- For recent notes, we cannot automatically determine who created them
-- They will continue to show inbox email until manually fixed or re-created
```

Unfortunately, existing notes without `sender_id` cannot be automatically attributed to the correct user since that information wasn't stored.

---

### Files to Modify

| File | Change |
|------|--------|
| `src/contexts/ConversationViewContext.tsx` | Add `sender_id: user.id` to insert, improve cache invalidation |
| `src/lib/normalizeMessage.ts` | Improve agent profile resolution when `sender_id` is present |

---

### Expected Behavior After Fix

1. **New notes appear immediately** - forced refetch on mutation success
2. **Notes show correct author** - "Joachim Rathke" with proper avatar
3. **Agent initials are correct** - "JR" instead of "H"
4. **Real-time updates work** - proper cache invalidation triggers instant UI updates

