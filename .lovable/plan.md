

# Fix: Global "Unread" Stat Should Only Count Open Conversations

## Problem
Line 64-65 of `get_all_counts()`:
```sql
COUNT(*) FILTER (WHERE is_read = false AND deleted_at IS NULL
  AND (snooze_until IS NULL OR snooze_until <= NOW()))::bigint as conversations_unread,
```
This counts unread conversations in ALL statuses (open, closed, pending, archived), giving 111 instead of the actual unread count within the open filter.

## Fix

### Migration: Add `AND status = 'open'` to global unread filter

**New file: `supabase/migrations/[timestamp]_fix_global_unread_open_only.sql`**

Update line 64 to:
```sql
COUNT(*) FILTER (WHERE is_read = false AND status = 'open' AND deleted_at IS NULL
  AND (snooze_until IS NULL OR snooze_until <= NOW()))::bigint as conversations_unread,
```

Also apply the same fix to `get_inbox_counts()` for consistency.

### No frontend changes needed
The Home page already reads `conversations.unread` — it just needs the correct number from the database.

