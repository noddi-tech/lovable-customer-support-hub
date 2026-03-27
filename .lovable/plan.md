

## Fix: Filter Google Groups Forwarding Echoes

### Problem

When an agent sends a reply, the email goes through Google Groups (hei@noddi.no), which forwards a copy back to the inbound pipeline (hei@inbound.noddi.no → SendGrid). This creates a duplicate "Customer" message with identical content to the agent's outbound reply. The dedup doesn't catch it because the echo has a different `email_message_id`.

In the screenshot: message 2 (Robert P., agent, 08:41) and message 3 (Customer, 08:48) have the same content — the 3rd is the Google Groups echo.

### Root Cause

`generateStableDedupKey` in `src/lib/normalizeMessage.ts` prefers `email_message_id` (line 473). Since the echo has its own Message-ID, it gets a unique dedup key and survives deduplication.

### Fix

Add a **content-based echo detection** pass in `useThreadMessagesList.ts` after standard dedup. For each inbound message, check if a recent outbound message (within ~10 minutes) has substantially the same text content. If so, mark it as an echo and filter it out.

This is safe because:
- It only filters inbound messages that match outbound messages (never the reverse)
- It requires both time proximity AND content similarity
- Legitimate customer replies with the same text would have different timing

### Changes

**File: `src/hooks/conversations/useThreadMessagesList.ts`**

After the existing dedup pass (line 26-45), add an echo-filtering step:

```ts
// Filter Google Groups forwarding echoes:
// When an agent reply is forwarded back through Google Groups,
// it appears as a new inbound message with identical content.
// Detect and remove these by comparing inbound content against
// recent outbound messages within a short time window.
function filterForwardingEchoes(messages: NormalizedMessage[]): NormalizedMessage[] {
  const ECHO_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  // Collect outbound message content hashes with timestamps
  const outboundHashes = new Map<string, number>(); // hash -> timestamp
  for (const m of messages) {
    if (m.direction === 'outbound' && !m.isInternalNote) {
      const hash = normalizeForEcho(m.visibleBody);
      if (hash) {
        outboundHashes.set(hash, new Date(m.createdAt).getTime());
      }
    }
  }

  return messages.filter(m => {
    if (m.direction !== 'inbound') return true; // keep outbound
    const hash = normalizeForEcho(m.visibleBody);
    if (!hash) return true; // keep if no content
    const outboundTime = outboundHashes.get(hash);
    if (outboundTime === undefined) return true; // no matching outbound
    const inboundTime = new Date(m.createdAt).getTime();
    // Echo arrives AFTER the outbound, within window
    if (inboundTime >= outboundTime && (inboundTime - outboundTime) < ECHO_WINDOW_MS) {
      return false; // filter echo
    }
    return true;
  });
}

function normalizeForEcho(body: string): string | null {
  // Strip HTML, collapse whitespace, lowercase, take first 200 chars
  const text = body
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return text.length > 20 ? text.substring(0, 200) : null;
}
```

Apply it after dedup:
```ts
const dedupedMessages = raw.filter(m => { ... });
const echoFiltered = filterForwardingEchoes(dedupedMessages);
// Then use echoFiltered for the rest of the pipeline
```

### Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/hooks/conversations/useThreadMessagesList.ts` | Add echo detection that filters inbound messages matching recent outbound content |

Single file change. No new dependencies. Only affects inbound messages that are content-identical to a recent outbound message within 15 minutes — safe for all email providers.

