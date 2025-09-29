# Conversation Merge Migration Guide

## Problem Summary

Email threads were being split into multiple conversations because the webhook functions incorrectly prioritized `In-Reply-To` over the `References` header when determining thread IDs. This caused each reply to get a different thread ID, creating duplicate conversations.

## What Was Fixed

### 1. Email Threading Logic (Already Applied)

Both `email-webhook` and `sendgrid-inbound` functions now use the correct priority order:

```typescript
// PRIORITY 1: References header (first Message-ID is the thread root)
// PRIORITY 2: In-Reply-To (fallback if no References)  
// PRIORITY 3: Message-ID (new thread)
```

**Files Updated:**
- ✅ `supabase/functions/email-webhook/index.ts`
- ✅ `supabase/functions/sendgrid-inbound/index.ts`

### 2. Retroactive Data Migration (Manual Step Required)

A migration script has been created to merge existing split conversations:

**Location:** `supabase/functions/merge-conversations-migration.ts`

## Running the Migration

**⚠️ IMPORTANT:** This migration script must be run manually on your local machine or server. It is NOT an edge function and will NOT be deployed automatically. You must execute it yourself using Deno.

### Prerequisites

1. **Install Deno** (if not already installed):
```bash
curl -fsSL https://deno.land/install.sh | sh
```

2. **Get Service Role Key:**
   - Go to Supabase Dashboard → Project Settings → API
   - Copy the `service_role` key (NOT the anon/public key)
   - This key bypasses RLS policies for administrative tasks

### Execute Migration

1. **Set Environment Variables:**
```bash
export SUPABASE_URL="https://qgfaycwsangsqzpveoup.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-service-role-key-here"
```

2. **Run the Script:**
```bash
# Navigate to your project directory
cd /path/to/customerhub

# Run the migration
deno run --allow-net --allow-env supabase/functions/merge-conversations-migration.ts
```

3. **Monitor Output:**
The script will display real-time progress and detailed logs.

### What the Migration Does

1. **Fetches** all messages with email headers from the database
2. **Recalculates** canonical thread IDs using the corrected logic
3. **Groups** messages by their correct thread ID
4. **Identifies** threads split across multiple conversations
5. **Merges** split conversations by:
   - Choosing the oldest conversation as primary
   - Reassigning all messages to the primary conversation
   - Updating thread IDs to be consistent
   - Deleting empty duplicate conversations
6. **Reports** detailed progress and summary

### Expected Output

```
🚀 Starting conversation merge migration...

📧 Fetching all messages with email headers...
✅ Found 450 messages with email headers

🔍 Computing canonical thread IDs...
✅ Found 180 unique threads

🔎 Identifying split conversations...
✅ Found 23 split threads affecting 87 messages

🔧 Starting merge process...

📌 Processing thread: CABkFj6...
   Messages: 4, Conversations: 2
   ✓ Primary conversation: a1b2c3d4...
   ✓ Reassigned 4 messages
   ✓ Updated primary conversation
   ✓ Deleted 1 duplicate conversations
   ✅ Successfully merged thread (1/23)

...

============================================================
📊 MIGRATION SUMMARY
============================================================
Total threads processed: 23
Successfully merged: 23
Failed: 0
Messages reassigned: 87
============================================================

✨ Migration completed successfully!
```

## Validation Queries

After running the migration, execute these SQL queries in Supabase SQL Editor:

### 1. Check for Orphaned Messages
```sql
SELECT COUNT(*) as orphaned_messages
FROM messages 
WHERE conversation_id NOT IN (SELECT id FROM conversations);
```
**Expected Result:** `0`

### 2. Check for Duplicate Thread IDs
```sql
SELECT external_id, COUNT(*) as count
FROM conversations 
GROUP BY external_id 
HAVING COUNT(*) > 1;
```
**Expected Result:** `0 rows`

### 3. Verify Message Counts
```sql
SELECT c.id, c.subject, COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY c.id, c.subject
HAVING COUNT(m.id) = 0;
```
**Expected Result:** `0 rows` (no conversations without messages)

### 4. Check Thread ID Consistency
```sql
SELECT 
  COUNT(*) as mismatched_threads
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE m.email_thread_id IS NOT NULL
  AND m.email_thread_id != c.external_id;
```
**Expected Result:** `0`

## Testing Strategy

### Before Production

1. **Create Database Backup:**
   - Go to Supabase Dashboard > Database > Backups
   - Create manual backup: "Before conversation merge migration"

2. **Test on Staging (Recommended):**
   - Clone production data to staging environment
   - Run migration on staging first
   - Verify results using validation queries
   - Test UI to ensure conversations display correctly

3. **Dry Run Analysis:**
   - Review migration output logs carefully
   - Note how many conversations will be merged
   - Identify any potential issues before production run

### After Production

1. Run all validation queries
2. Check conversation UI for correct threading
3. Verify no duplicate conversations appear
4. Test email reply functionality

## Expected Results

✅ **Future Emails:**
- All replies in same thread grouped under one conversation
- Matches HelpScout behavior
- Clean conversation list

✅ **Historical Data:**
- Existing split conversations merged
- One conversation per email thread
- All messages preserved and correctly associated
- Clean analytics and counts

## Rollback Plan

If issues occur:

1. **Restore from backup:**
   - Go to Supabase Dashboard > Database > Backups
   - Restore "Before conversation merge migration" backup

2. **Review logs:**
   - Check migration output for errors
   - Identify problematic threads

3. **Fix and retry:**
   - Address specific issues
   - Test on staging again
   - Re-run migration

## Troubleshooting

### Migration Shows 0 Split Threads

This means all conversations are already correctly grouped. No action needed.

### Some Threads Failed to Merge

- Check error messages in migration output
- Common causes:
  - RLS policies blocking service role
  - Foreign key constraints
  - Missing data
- Fix issues and re-run (migration is idempotent)

### Performance Issues

For very large databases (>10,000 messages):
- Run during off-peak hours
- Monitor database CPU/memory
- Consider batching (process in chunks)

## Support

If you encounter issues:
1. Check validation queries first
2. Review migration logs for errors
3. Verify edge function logs for new incoming emails
4. Ensure RLS policies allow service role access

## Notes

- Migration is **idempotent** - safe to run multiple times
- Messages are **never deleted**, only reassigned
- Duplicate conversations only deleted if empty
- Progress logged to console for monitoring
- Service role key bypasses RLS policies
