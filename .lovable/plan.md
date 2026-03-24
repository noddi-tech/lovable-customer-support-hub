

## Fix: Backfill Migration Was Overwritten by `updated_at` Trigger

### What went wrong
The `conversations` table has a BEFORE UPDATE trigger (`update_conversations_updated_at`) that runs `update_updated_at_column()`. This function sets `NEW.updated_at = now()` on every update — so the backfill migration's carefully computed timestamps were all overwritten with the current time.

### Fix
Run a new migration that **disables the trigger**, performs the backfill, then **re-enables it**.

```sql
-- Temporarily disable the auto-update trigger
ALTER TABLE public.conversations DISABLE TRIGGER update_conversations_updated_at;

-- Backfill updated_at from the latest message
UPDATE public.conversations c
SET updated_at = sub.latest_msg
FROM (
  SELECT conversation_id, MAX(created_at) AS latest_msg
  FROM public.messages
  GROUP BY conversation_id
) sub
WHERE c.id = sub.conversation_id
  AND sub.latest_msg IS NOT NULL;

-- Re-enable the trigger
ALTER TABLE public.conversations ENABLE TRIGGER update_conversations_updated_at;
```

| Action | Detail |
|--------|--------|
| SQL migration | Disable trigger → backfill → re-enable trigger |
| Files changed | 1 new migration file |

