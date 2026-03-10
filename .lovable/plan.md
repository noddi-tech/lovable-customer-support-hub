

## Plan: Fix Build Error + Ensure Consistent Counting

### 1. Fix stale TS2304 build error

The `cn` import exists on line 7 of `ChatReplyInput.tsx`. The error pointing to line 351 (`onChange={handleFileSelect}`) referencing `cn` is nonsensical — it's a stale build cache issue. A trivial whitespace change to the file will force Vite to re-parse it and clear the error.

**File**: `src/components/conversations/ChatReplyInput.tsx` — add a trailing comment or blank line to force rebuild.

### 2. Counter consistency is already in place

The SQL migration already applies thread-aware counting (`DISTINCT ON` + `threaded` CTE) to **all** filters — Open, Pending, Closed, Assigned, Unread, All, Archived, Deleted, and channel counts all query from the same `threaded` CTE. The logic is consistent across every counter. No SQL changes needed.

### Files changed

| File | Change |
|---|---|
| `src/components/conversations/ChatReplyInput.tsx` | Trivial edit to force rebuild and clear stale TS2304 |

