

# Fix: Extraction Job Stuck in "Running" Status

## Problem Analysis

The extraction processed **all 6,742 conversations** (created 3,448 entries, skipped 3,294), but the job status in the database is still `"running"` with `completed_at: null`. This causes the UI to show a spinning loader indefinitely.

## Root Cause

The edge function has a logic bug:

| Scenario | What Happens | Database Updated? |
|----------|--------------|-------------------|
| `conversations.length === 0` | Returns 'completed', updates DB | Yes |
| `conversations.length < batchSize` (final batch) | Returns 'completed', **skips DB update** | No |
| `conversations.length === batchSize` | Returns 'in_progress' | No (correctly) |

The final batch had 42 conversations (6742 - 6700 = 42). Since 42 < 50, the function returned `'completed'` but never updated the database status.

## Solution

### 1. Fix Edge Function Logic

Update `extract-knowledge-from-history/index.ts` to mark the job as completed when `hasMore === false`:

```typescript
// After processing entries and updating progress...

const hasMore = conversations.length === batchSize;

// Mark job as completed if this is the last batch
if (!hasMore) {
  await supabase
    .from('knowledge_extraction_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', currentJobId);
}

return new Response(JSON.stringify({
  status: hasMore ? 'in_progress' : 'completed',
  // ...
}));
```

### 2. Immediate Fix for Current Job

Run a database update to fix the stuck job:

```sql
UPDATE knowledge_extraction_jobs 
SET status = 'completed', completed_at = NOW() 
WHERE id = '25bceb08-9996-41ed-9562-aaa52e70c405';
```

### 3. Add Frontend Recovery Button (Optional)

Add a "Mark Complete" button that appears when job is stuck (running for >1 hour with 100% progress):

```typescript
const isStuckJob = latestJob?.status === 'running' && 
  latestJob.total_processed >= latestJob.total_conversations &&
  latestJob.total_conversations > 0;
```

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/extract-knowledge-from-history/index.ts` | Add DB update when `hasMore === false` |
| Database | Fix current stuck job via migration |

## Summary

| Step | Action |
|------|--------|
| 1 | Fix edge function to update DB status on final batch |
| 2 | Run migration to complete the current stuck job |
| 3 | Redeploy edge function |

After this fix, the UI will show "completed" status and stop spinning.

