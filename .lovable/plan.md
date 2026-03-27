

## Fix: Forwarding Echo Detection — Two Bugs

### Problem

The echo filter isn't catching duplicates because:

1. **Time window too narrow**: Echoes can arrive 20 minutes to days later (not just 15 min)
2. **Content doesn't match**: The echo message contains forwarding headers like `"Fra: Noddi Support Sendt: fredag 13. mars 2026 09:10 Til: Robert Bue Emne: Re: Felgreparasjon Hei, vi har svart på chatten..."` — the actual agent text is buried after these headers, so `normalizeForEcho` comparing the first 200 chars will never match

### Fix — Two changes

**1. Client-side: Smarter echo detection** (`src/hooks/conversations/useThreadMessagesList.ts`)

Instead of comparing first-200-char hashes, check if an inbound message **contains** the outbound message's normalized text (substring match). Also remove the time window — any inbound message that contains a recent outbound message's full text is an echo regardless of timing.

```ts
function filterForwardingEchoes(messages: NormalizedMessage[]): NormalizedMessage[] {
  // Collect outbound message text (strip HTML, collapse whitespace, lowercase)
  const outboundTexts: string[] = [];
  for (const m of messages) {
    if (m.direction === 'outbound' && !m.isInternalNote) {
      const text = stripToText(m.visibleBody);
      if (text && text.length > 30) {
        outboundTexts.push(text);
      }
    }
  }
  if (outboundTexts.length === 0) return messages;

  return messages.filter(m => {
    if (m.direction !== 'inbound') return true;
    const inboundText = stripToText(m.visibleBody);
    if (!inboundText || inboundText.length < 30) return true;
    
    // Check if inbound contains any outbound text (substring)
    for (const outText of outboundTexts) {
      // Use a significant portion (first 80 chars) of the outbound as search key
      const searchKey = outText.substring(0, 80);
      if (inboundText.includes(searchKey)) {
        return false; // It's an echo
      }
    }
    return true;
  });
}

function stripToText(body: string): string | null {
  const text = body
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return text.length > 30 ? text : null;
}
```

**2. Edge function: Same fix + deploy** (`supabase/functions/cleanup-forwarding-echoes/index.ts`)

Apply the same substring-match logic (using first 80 chars of agent content as search key within inbound content). Remove the time window constraint. Then deploy so it can actually run.

### Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/hooks/conversations/useThreadMessagesList.ts` | Substring match instead of hash comparison; remove time window |
| 2 | `supabase/functions/cleanup-forwarding-echoes/index.ts` | Same substring logic; deploy for cleanup |

