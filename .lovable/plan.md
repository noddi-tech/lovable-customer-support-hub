

# Fix: Cancel Confirmation Showing Action Menu + Raw [YES_NO] Tag

## Problem

When the AI shows the booking and asks "Er dette bestillingen du vil kansellere?", two things go wrong:

1. **`patchActionMenu` auto-injects** the full edit action menu because it sees `[BOOKING_INFO]` in the reply -- it doesn't know we're in a cancellation confirmation context.
2. **The AI outputs a bare `[YES_NO]` tag** (without wrapping the question or including a closing tag), so `patchYesNo` doesn't recognize it. Then `patchYesNo` also skips because `[ACTION_MENU]` was already injected.

## Changes (all in `supabase/functions/widget-ai-chat/index.ts`)

### 1. `patchActionMenu` -- skip during cancel confirmation

Add a guard near the top of `patchActionMenu`: if the reply text contains a cancellation confirmation question (mentions "kansellere" or "avbestille" in a question), skip injection entirely. The user is being asked whether to cancel -- showing "Endre tidspunkt / Endre adresse / Avbestille" alongside that makes no sense.

```typescript
// Skip if reply is asking a cancellation confirmation question
if (/(?:kansellere|avbestille|cancel).*\?/is.test(reply)) return reply;
```

### 2. `patchYesNo` -- handle bare `[YES_NO]` markers

Add handling at the top of `patchYesNo` for when the AI outputs a bare `[YES_NO]` tag (without closing tag or without wrapping the question). Find the preceding question sentence, wrap it properly, and remove the bare marker.

```typescript
// Handle bare [YES_NO] marker (AI wrote tag without wrapping the question)
if (reply.includes('[YES_NO]') && !reply.includes('[/YES_NO]')) {
  const bareRemoved = reply.replace(/\[YES_NO\]/g, '').trim();
  // Find the last question sentence
  const qMatch = bareRemoved.match(/([^\n.]{10,150}\?)\s*$/);
  if (qMatch) {
    const before = bareRemoved.substring(0, qMatch.index!).trimEnd();
    return [before, `[YES_NO]${qMatch[1]}[/YES_NO]`]
      .filter(s => s.length > 0).join('\n');
  }
}
```

### 3. Deploy

Redeploy `widget-ai-chat`.

## Expected Result

1. User asks to cancel
2. AI shows `[BOOKING_INFO]` card + "Er dette bestillingen du vil kansellere?" with `[YES_NO]` buttons
3. No action menu. No raw tags.
