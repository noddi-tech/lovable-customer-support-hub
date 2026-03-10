

## Investigation Summary

I found **two root causes** behind the issues:

### Problem 1: Counter numbers don't match what's shown in the list

The SQL count functions (`get_all_counts` and `get_inbox_counts`) count conversations differently than the client-side tab filters, causing mismatched numbers.

**SQL counts "Open" as:**
```sql
COUNT(*) FILTER (WHERE status = 'open' AND deleted_at IS NULL)
```

**Client-side "Open" tab shows:**
```
status === 'open' AND !is_archived AND !isSnoozedActive AND !is_deleted
```

The SQL doesn't exclude **archived** or **snoozed** conversations from the Open/Pending/Closed counts. So if 3 conversations are snoozed but still `status='open'`, the counter shows them but the list hides them. Same issue for archived conversations — they get double-counted in both their status bucket and the archived count.

### Problem 2: Counters don't update in real-time

The realtime subscription correctly invalidates `inboxCounts` and `all-counts` query keys when conversation changes are detected. However, the `useInboxCounts` hook only has a 30-second staleTime with no polling fallback. If the Supabase realtime channel drops or events are missed, counters go stale until the next window focus.

---

## Fix Plan

### 1. Fix SQL count functions to match client-side filter logic

**New migration** — Update both `get_all_counts()` and `get_inbox_counts(uuid)` to exclude archived and snoozed conversations from status-specific counts:

```sql
-- Open: status='open', not archived, not snoozed, not deleted
COUNT(*) FILTER (WHERE status = 'open' AND deleted_at IS NULL 
  AND is_archived = false 
  AND (snooze_until IS NULL OR snooze_until <= NOW()))::bigint

-- Pending: same exclusions
COUNT(*) FILTER (WHERE status = 'pending' AND deleted_at IS NULL 
  AND is_archived = false 
  AND (snooze_until IS NULL OR snooze_until <= NOW()))::bigint

-- Closed: same exclusions  
COUNT(*) FILTER (WHERE status = 'closed' AND deleted_at IS NULL 
  AND is_archived = false 
  AND (snooze_until IS NULL OR snooze_until <= NOW()))::bigint

-- Assigned: also exclude archived/snoozed
COUNT(*) FILTER (WHERE assigned_to_id = v_profile_id AND deleted_at IS NULL
  AND is_archived = false
  AND (snooze_until IS NULL OR snooze_until <= NOW()))::bigint

-- Unread: exclude archived/snoozed
COUNT(*) FILTER (WHERE is_read = false AND deleted_at IS NULL
  AND is_archived = false
  AND (snooze_until IS NULL OR snooze_until <= NOW()))::bigint

-- All: everything not archived, not snoozed, not deleted
COUNT(*) FILTER (WHERE deleted_at IS NULL 
  AND is_archived = false
  AND (snooze_until IS NULL OR snooze_until <= NOW()))::bigint

-- Archived and Deleted stay as-is
```

### 2. Add polling fallback for counter freshness

**File: `src/hooks/useInteractionsData.ts`** — Add a `refetchInterval` to `useInboxCounts` as a safety net for when realtime events are missed:

```typescript
export function useInboxCounts(inboxId: InboxId) {
  return useQuery({
    queryKey: ['inboxCounts', inboxId],
    queryFn: () => getInboxCounts(inboxId),
    enabled: !!inboxId,
    staleTime: 15 * 1000,        // 15 seconds (was 30s)
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,  // NEW: poll every 30s as fallback
  });
}
```

### Files changed

| File | Change |
|---|---|
| New SQL migration | Fix `get_all_counts` and `get_inbox_counts` to exclude archived/snoozed from status counts |
| `src/hooks/useInteractionsData.ts` | Add 30s polling fallback to `useInboxCounts` |

