

# Fix: Sidebar Counts Not Updating in Real-Time

## Root Cause

The database functions are now returning correct data (confirmed via network response). The issue is that **sidebar counts never refresh when conversations change in real-time**.

Here is how it works today:

1. A conversation status changes (e.g., open -> pending)
2. Supabase realtime fires an event for the `conversations` table
3. The realtime handler (in `useSimpleRealtimeSubscriptions`) refetches queries where `queryKey[0] === 'conversations'`
4. The conversation list updates correctly
5. But `inboxCounts` and `all-counts` queries are **NOT refetched** -- they only update after the 30-second staleTime or on window refocus

This is why the counts appear stuck even though the conversation list shows updated data.

## The Fix

**File: `src/hooks/useSimpleRealtimeSubscriptions.ts`** (lines 136-174)

Inside the realtime event handler for `conversations` table changes, add invalidation of count-related queries alongside the existing conversation cache update:

```
if (table === 'conversations') {
  // ... existing optimistic cache update code stays ...
  
  // NEW: Also invalidate count queries so sidebar updates immediately
  queryClient.invalidateQueries({ queryKey: ['inboxCounts'] });
  queryClient.invalidateQueries({ queryKey: ['all-counts'] });
  queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
}
```

This ensures that any time a conversation is created, updated, or deleted, all count queries are marked stale and refetched for active components.

**File: `src/contexts/RealtimeProvider.tsx`** (lines 20-34)

Add dedicated realtime config entries so the `conversations` table also triggers count refreshes:

```
{ table: 'conversations', queryKey: 'inboxCounts' },
{ table: 'conversations', queryKey: 'all-counts' },
```

This provides a second layer of guarantee: even if the inline invalidation is missed, the standard refetch mechanism will also trigger for count queries.

## Why This is Bulletproof

Three layers of count refresh:
1. **Realtime event** -- Immediate invalidation when any conversation changes (new fix)
2. **Manual invalidation** -- Already exists in status change handlers, assign dialogs, bulk actions, etc.
3. **Polling fallback** -- 30-second staleTime on `useInboxCounts`, 5-minute refetchInterval on `useOptimizedCounts`

This covers: realtime DB changes, user actions in other tabs, and graceful degradation if realtime disconnects.

## Changes Summary

| File | Change |
|---|---|
| `src/hooks/useSimpleRealtimeSubscriptions.ts` | Add `inboxCounts` and `all-counts` invalidation inside the conversations realtime handler |
| `src/contexts/RealtimeProvider.tsx` | Add two config entries linking `conversations` table to count query keys |

Two files, roughly 6 lines of code added. No database changes needed.
