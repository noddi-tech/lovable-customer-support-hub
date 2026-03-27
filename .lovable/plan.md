

## Cleanup Google Groups Forwarding Echoes — Edge Function Script

### What it does

Creates a new Edge Function `cleanup-forwarding-echoes` that scans all conversations and deletes inbound messages that are content-identical echoes of agent replies (caused by Google Groups forwarding).

### Detection logic

For each conversation:
1. Fetch all messages ordered by `created_at`
2. For each agent message (`sender_type = 'agent'`), compute a content hash: strip HTML tags, collapse whitespace, lowercase, take first 200 chars
3. For each non-agent message, compute the same hash
4. If a non-agent message has the same hash as an agent message AND was created within 15 minutes AFTER the agent message → it's an echo → delete it

### Technical details

**New file: `supabase/functions/cleanup-forwarding-echoes/index.ts`**

- Uses service role client
- Paginates through all conversations (1000 at a time)
- For each conversation, fetches messages with `id, content, sender_type, created_at`
- Applies the same `normalizeForEcho()` logic used client-side
- Deletes echo messages in batches of 50
- Tracks execution time with 45s timeout safety (same pattern as `cleanup-duplicate-messages`)
- Returns summary: `{ conversationsScanned, echoesFound, echoesDeleted }`

**Key differences from client-side filtering:**
- Server-side uses `sender_type` column directly (client-side uses normalized `direction`)
- Agent messages: `sender_type = 'agent'`
- Echo candidates: `sender_type != 'agent'` AND `is_internal != true`

### Safety

- Only deletes non-agent, non-internal messages that exactly match agent content within 15 min
- Dry-run mode by default (pass `{ dryRun: false }` to actually delete)
- Logs every echo found for audit

### Invocation

Can be triggered from the admin UI or manually via Supabase dashboard. Single run, no scheduling needed.

