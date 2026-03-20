

## Fix Existing Messages with Broken Norwegian Characters

### Problem
The `gmail-sync` upsert uses `ignoreDuplicates: true`, so re-syncing skips messages that already exist in the database. The corrupted `å→�` content is already stored and won't be overwritten by a normal sync.

### Solution
Change the upsert behavior so that when a message already exists (matched by `external_id`), it **updates the content** with the freshly decoded version. This way, triggering a sync will re-fetch the messages from Gmail and overwrite the broken content with properly decoded text.

### Changes

**File: `supabase/functions/gmail-sync/index.ts`**

1. Change the upsert from `ignoreDuplicates: true` to `ignoreDuplicates: false` — this makes it update existing rows on conflict
2. Limit the update to only content-related fields to avoid overwriting other metadata:
   - `content` and `content_type` get updated
   - Other fields (conversation_id, sender_type, etc.) are preserved

### What happens when you hit "Sync"
1. Gmail sync fetches messages from Gmail API (read-only — no emails sent)
2. For new messages: inserted as before
3. For existing messages: `content` and `content_type` are updated with freshly decoded text (now using the UTF-8-priority decoder)
4. Norwegian characters should render correctly after sync completes

### Risk
None — this is a read-only fetch from Gmail + database update. No emails are sent, no data is lost.

| File | Change |
|------|--------|
| `gmail-sync/index.ts` | Change `ignoreDuplicates: true` → `false`, scope update to content fields |

