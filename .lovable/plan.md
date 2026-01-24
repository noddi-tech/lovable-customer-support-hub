
## Complete Fix for Agent Attribution and Backfill

### Overview
This plan addresses two issues:
1. **Forward-fix**: Ensure all new agent messages display correct author names
2. **Backfill**: Populate `sender_id` for 86 existing messages where possible

---

### Part 1: Fetch Agent Profiles in useThreadMessages

The current query fetches messages but does NOT join profile data for agents. We need to add a secondary lookup to fetch agent profiles.

**File:** `src/hooks/conversations/useThreadMessages.ts`

**Changes (after line 109):**

```typescript
// After fetching messages, extract unique agent sender_ids
const agentSenderIds = [...new Set(
  (rows ?? [])
    .filter(r => r.sender_type === 'agent' && r.sender_id)
    .map(r => r.sender_id)
)];

// Fetch agent profiles in a separate query (sender_id is auth user_id, not profile.id)
let agentProfiles: Record<string, { full_name: string; email: string }> = {};
if (agentSenderIds.length > 0) {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, email')
    .in('user_id', agentSenderIds);
  
  agentProfiles = (profiles ?? []).reduce((acc, p) => {
    if (p.user_id) {
      acc[p.user_id] = { full_name: p.full_name, email: p.email };
    }
    return acc;
  }, {} as Record<string, { full_name: string; email: string }>);
}

// Then, before mapping to normalizeMessage, inject profile data into each row:
const rowsWithProfiles = typedRows.map(r => ({
  ...r,
  sender_profile: r.sender_type === 'agent' && r.sender_id 
    ? agentProfiles[r.sender_id] 
    : undefined
}));
```

**Update line 173:**
```typescript
const normalized = rowsWithProfiles.map(r => normalizeMessage(r, ctx));
```

---

### Part 2: Backfill Migration Script

Create a one-time migration to populate `sender_id` for existing agent messages.

**Strategy:**
1. **From response_tracking:** 10 messages have `agent_id` we can copy
2. **Single-agent fallback:** If only one agent exists in the org, attribute to them
3. **Recent messages by Joachim:** For messages in last 90 days without attribution, if Joachim is the only active agent, attribute to him

**Migration SQL:**

```sql
-- Step 1: Backfill from response_tracking (high confidence - 10 messages)
UPDATE messages m
SET sender_id = rt.agent_id
FROM response_tracking rt
WHERE rt.message_id = m.id
  AND m.sender_id IS NULL
  AND m.sender_type = 'agent'
  AND rt.agent_id IS NOT NULL;

-- Step 2: For remaining messages, attribute to the conversation's assigned agent if any
-- This assumes the assigned agent likely wrote the message
UPDATE messages m
SET sender_id = p.user_id
FROM conversations c
JOIN profiles p ON p.id = c.assigned_to_id
WHERE m.conversation_id = c.id
  AND m.sender_id IS NULL
  AND m.sender_type = 'agent'
  AND c.assigned_to_id IS NOT NULL;

-- Step 3: Count remaining unattributed messages
SELECT COUNT(*) as still_missing
FROM messages 
WHERE sender_id IS NULL 
  AND sender_type = 'agent';
```

**Note:** Messages that cannot be attributed will continue showing the inbox email. This is acceptable for historical data.

---

### Part 3: Verify Existing Code Safety

The current `sender_id: user.id` in ConversationViewContext.tsx applies to ALL agent messages (both replies and notes) - this is already correct.

**Verification checklist:**
- Line 306: `sender_id: user.id` - applies to all `sendReplyMutation` calls
- Both internal notes (`isInternal: true`) and replies (`isInternal: false`) use the same mutation
- The `user.id` is the auth user ID (from `useAuth`), which matches `profiles.user_id`

---

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/conversations/useThreadMessages.ts` | Add secondary query to fetch agent profiles by `user_id` |
| One-time SQL migration | Backfill `sender_id` from `response_tracking` and `assigned_to_id` |

---

### Expected Results After Implementation

| Scenario | Before | After |
|----------|--------|-------|
| New note by Joachim | "hei@noddi.no" with "H" avatar | "Joachim Rathke" with "JR" avatar |
| New reply by any agent | Correct name (was already working if sender_id set) | Correct name |
| Old messages with response_tracking | Wrong/no attribution | Correct attribution (10 messages) |
| Old messages with assigned agent | Wrong/no attribution | Correct attribution (varies) |
| Very old unattributed messages | Inbox email fallback | Inbox email fallback (unchanged) |

---

### Testing Plan

1. Create a new internal note - should show your name immediately
2. Send a reply - should show your name
3. Check old notes after backfill - should show correct names where backfilled
4. Verify no regressions in email sending or conversation status updates
