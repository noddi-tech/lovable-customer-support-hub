

## Delete Corrupted Bounce-Back Message

There's exactly one corrupted duplicate in the database: message `f8315acf` — a bounce-back of agent message `9b113c5f` that came through SendGrid inbound with broken Norwegian encoding.

### Plan

**Database migration** — single DELETE statement:

```sql
DELETE FROM messages 
WHERE id = 'f8315acf-31c0-473d-8608-0ad1a56da5d3';
```

This removes the corrupted duplicate. The clean agent version (`9b113c5f`) remains. No other duplicates exist in the system.

The loop detection we deployed earlier will prevent this from happening again.

| Action | Detail |
|--------|--------|
| Migration | Delete message `f8315acf` (corrupted bounce-back) |
| Files changed | None — database only |

