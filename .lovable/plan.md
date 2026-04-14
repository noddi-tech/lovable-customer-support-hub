

# Fix: Inbox Cards Show Total Instead of Open Conversations

## Root Cause

In `get_all_counts()`, the per-inbox count subquery (lines 82-87) counts all non-deleted threaded conversations regardless of status:

```sql
SELECT inbox_id, COUNT(*)::int as cnt
FROM threaded
WHERE deleted_at IS NULL
GROUP BY inbox_id
```

This returns 4690 for "Noddi" because it includes open + closed + pending + archived. The home page and sidebar display this as-is, but users expect to see the **open** count (7 for Noddi).

## Fix

### 1. Migration: Add `open_count` and `unread_count` to inbox JSON

**New file: `supabase/migrations/[timestamp]_fix_inbox_counts_open.sql`**

Update the `inbox_data` CTE in `get_all_counts()` to include `open_count` and `unread_count` alongside the existing `conversation_count`:

```sql
LEFT JOIN (
  SELECT inbox_id, 
    COUNT(*)::int as cnt,
    COUNT(*) FILTER (WHERE status = 'open' 
      AND (snooze_until IS NULL OR snooze_until <= NOW()))::int as open_cnt,
    COUNT(*) FILTER (WHERE is_read = false 
      AND (snooze_until IS NULL OR snooze_until <= NOW()))::int as unread_cnt
  FROM threaded
  WHERE deleted_at IS NULL
  GROUP BY inbox_id
) conv_count ON conv_count.inbox_id = i.id
```

JSON output adds `open_count` and `unread_count` fields.

### 2. Update `useOptimizedCounts` types

**File: `src/hooks/useOptimizedCounts.tsx`**
- Add `open_count` and `unread_count` to the inbox item interface

### 3. Update Home page to show open count

**File: `src/pages/HomePage.tsx`**
- Display `inbox.open_count` instead of `inbox.conversation_count`
- Show label like "open" instead of "conversations"
- Optionally show unread count as a small badge

### Files to create/modify
- **Create**: `supabase/migrations/[timestamp]_fix_inbox_counts_open.sql`
- **Modify**: `src/hooks/useOptimizedCounts.tsx` — add new fields to inbox type
- **Modify**: `src/pages/HomePage.tsx` — display open count per inbox

