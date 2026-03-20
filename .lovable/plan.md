

## Fix: `get_conversations` Still Excludes Archived from Status Filters

### Problem

The count functions were updated to include archived conversations in status counts (Closed shows 8), but the `get_conversations` RPC still has this line:

```sql
AND (p_status_filter = 'archived' OR c.is_archived = false)
```

This means when filtering by "closed", archived conversations are excluded from the **results** even though they're included in the **count**. Hence: "Closed: 8" but "No conversations found".

### Fix

**SQL migration** — Remove the `is_archived` exclusion from `get_conversations`:

Find the latest version of `get_conversations` and remove the line:
```sql
AND (p_status_filter = 'archived' OR c.is_archived = false)
```

This makes the conversation list consistent with the counts — archived+closed conversations appear in both "Closed" and "Archived" views.

| Action | Detail |
|--------|--------|
| Migration | Update `get_conversations` to remove `is_archived = false` exclusion for non-archived tabs |
| Files changed | SQL migration only |

