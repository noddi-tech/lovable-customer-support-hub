

# Fix: Customer Replies Hidden by Forwarding Echo Filter

## Problem

The conversation view is missing customer replies in email threads. You can see 1 inbound message from the customer and 5 outbound agent messages, but the customer's responses between those agent messages are invisible.

**Root cause:** The `filterForwardingEchoes` function in `src/hooks/conversations/useThreadMessagesList.ts` (lines 27-66) is designed to hide duplicate messages from Google Groups forwarding, but it's too aggressive. It checks whether the first 80 characters of any earlier agent message appear anywhere inside an inbound customer message. Since email clients always quote the previous message in replies, virtually every customer reply contains the agent's earlier text — and gets filtered out as a "forwarding echo."

## Fix

### `src/hooks/conversations/useThreadMessagesList.ts`

Make the echo filter much stricter so it only catches true forwarding duplicates (where the inbound message is *mostly* a copy of the agent message), not legitimate replies that quote the agent:

1. **Require high content overlap, not just substring match.** A true forwarding echo is nearly identical to the agent message. A legitimate reply has new content plus a quote. Check that the inbound message's text length is within ~30% of the agent text length (echoes are near-identical copies, replies add new content).

2. **Add logging for filtered messages** so you can verify no legitimate replies are being hidden.

3. **Only match if the inbound message starts with** (or is dominated by) the agent text — not just "contains" it somewhere.

Concrete change — replace the inner matching logic (lines 52-63):

```typescript
// Current (too aggressive):
const searchKey = agentMsg.text.substring(0, 80);
if (inboundText.includes(searchKey)) { ... return false; }

// Fixed (strict echo detection):
// Only filter if the inbound message is very similar in length (within 30%)
// AND contains the agent text — this catches true forwarding echoes
// but preserves customer replies that quote the agent
const lengthRatio = inboundText.length / agentMsg.text.length;
if (lengthRatio < 0.7 || lengthRatio > 1.3) continue; // Different length = not an echo
const searchKey = agentMsg.text.substring(0, 120);
if (inboundText.includes(searchKey)) {
  logger.debug('Filtering forwarding echo', { messageId: m.id, matchedAgainst: agentMsg.id, lengthRatio }, 'EchoFilter');
  return false;
}
```

This ensures:
- Customer replies (which add new text, making them longer) pass through
- True forwarding echoes (nearly identical length copies) are still filtered

### File to change

- `src/hooks/conversations/useThreadMessagesList.ts` — tighten echo filter logic

## Technical detail

The length ratio check is the key safeguard. A customer reply that quotes an agent message will be significantly longer than the original (new content + quote + signature). A forwarding echo will be roughly the same length (±30%). This single check eliminates nearly all false positives while still catching true duplicates.

