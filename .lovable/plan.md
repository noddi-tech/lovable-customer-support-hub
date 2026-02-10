

# Fix: "Assigned to Me" Filter Shows No Conversations

## Problem

The sidebar correctly shows **2 assigned conversations** because the database function `get_all_counts` filters by `assigned_to_id = v_profile_id` (the current user's profile ID). However, the conversation list shows **0 results** because the client-side filter in `ConversationListContext.tsx` only checks if a conversation has *any* assignment (`!!conversation.assigned_to`), not whether it's assigned to the **current user**.

Additionally, the RPC `get_conversations_with_session_recovery` fetches all conversations for the organization, so even conversations assigned to other agents would pass through -- but the real issue is that the client-side filter logic is wrong.

## Root Cause

In `ConversationListContext.tsx`, the "assigned" tab filter (appears twice, lines ~373 and ~544) uses:

```typescript
case "assigned":
  return !!conversation.assigned_to   // <-- checks ANY assignment
    && !conversation.is_archived
    && !isSnoozedActive
    && !conversation.is_deleted;
```

This should instead check that `assigned_to.id` matches the current user's **profile ID** (not `auth.uid()`, since `assigned_to_id` references `profiles.id`).

## Fix

### File: `src/contexts/ConversationListContext.tsx`

1. **Get the profile from useAuth** -- Change `const { user } = useAuth()` to `const { user, profile } = useAuth()` to access the current user's profile ID.

2. **Update both "assigned" filter cases** (lines ~373 and ~544) to compare against the current user's profile ID:

```typescript
case "assigned":
  // Assigned to Me: assigned to current user, not archived, not snoozed, not deleted
  return !!conversation.assigned_to
    && conversation.assigned_to.id === profile?.id
    && !conversation.is_archived
    && !isSnoozedActive
    && !conversation.is_deleted;
```

### Changes Summary

| File | Change |
|------|--------|
| `src/contexts/ConversationListContext.tsx` | Destructure `profile` from `useAuth()`, update 2 filter cases to match `assigned_to.id === profile?.id` |

No database changes needed -- the database counts are already correct.
