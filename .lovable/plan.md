

# Fix: Unread Badge Shows All Unread Instead of Open+Unread

## Problem
The red unread badge on inbox cards shows 50 for "Noddi" because the SQL counts ALL unread conversations regardless of status. Users expect unread count to reflect only open conversations that are unread.

## Fix

### Migration: Filter unread by open status
**File: `supabase/migrations/[timestamp]_fix_unread_open_only.sql`**

Update the `get_all_counts` function's inbox subquery to filter unread by `status = 'open'`:

```sql
COUNT(*) FILTER (WHERE is_read = false 
  AND status = 'open'
  AND (snooze_until IS NULL OR snooze_until <= NOW()))::int as unread_cnt
```

This ensures the red badge only shows unread conversations that are actually in the open queue.

### Files
- **Create**: `supabase/migrations/[timestamp]_fix_unread_open_only.sql` — recreate `get_all_counts` with the additional `status = 'open'` filter on `unread_cnt`

