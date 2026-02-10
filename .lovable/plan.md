

# Fix: Unblock Agent Reply Sending

## Problem

When an agent sends a reply, inserting into the `messages` table triggers `log_message_insertions`, which tries to insert into `debug_logs`. The `debug_logs` RLS policy requires `manage_users` permission, which most agents lack. This blocks the entire message insert.

## Fix

Create a migration to drop the debug trigger and its function:

```sql
DROP TRIGGER IF EXISTS log_message_insertions ON public.messages;
DROP FUNCTION IF EXISTS log_message_insertion();
```

## Result

After this single migration, agents will be able to send replies from the Support page. No client-side code changes needed.

