

# Fix: Forced-Text Call Fails Due to Missing Tool Responses

## Root Cause

When the safety break triggers inside the tool execution loop, the assistant message (containing multiple `tool_calls`) has already been pushed to the conversation history. But the `break` exits before all tool calls have corresponding tool response messages. 

OpenAI's API strictly requires that every `tool_call` in an assistant message has a matching `tool` response message. The forced-text call sends this incomplete history, gets a **400 error**, and silently falls through to the "Beklager" fallback.

This is why it fails every time -- the recovery mechanism itself is broken.

## Fix

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change 1: When breaking the loop, add placeholder tool responses for any remaining unanswered tool calls** (lines 1484-1511)

After `loopBroken = true; break;`, before exiting the for-loop, iterate over the remaining tool calls in `assistantMessage.tool_calls` and push synthetic tool responses for each one that was skipped:

```typescript
if (loopBroken) {
  // Pad missing tool responses so OpenAI doesn't reject the messages
  const answeredIds = new Set(
    currentMessages
      .filter(m => m.role === 'tool')
      .map(m => m.tool_call_id)
  );
  for (const tc of assistantMessage.tool_calls) {
    if (!answeredIds.has(tc.id)) {
      currentMessages.push({
        role: 'tool',
        content: JSON.stringify({ error: 'Tool call skipped. Use data already in conversation.' }),
        tool_call_id: tc.id,
      });
    }
  }
  break;
}
```

**Change 2: Add error logging for the forced-text call** (line 1531)

When `finalResp.ok` is false, log the status and body so we can see failures:

```typescript
if (!finalResp.ok) {
  const errBody = await finalResp.text();
  console.error('[widget-ai-chat] Final forced-text call returned', finalResp.status, errBody);
}
```

## Technical Details

| Item | Detail |
|------|--------|
| File | `supabase/functions/widget-ai-chat/index.ts` |
| Lines affected | ~1484-1512 (loop break logic), ~1531 (error logging) |
| Deploy | Re-deploy `widget-ai-chat` edge function |

## Expected Result

When user clicks "Endre tid":
1. AI calls tools, safety break triggers
2. Missing tool responses are padded with synthetic messages
3. Forced-text call succeeds (valid message history)
4. AI outputs [TIME_SLOT] marker
5. Widget renders the time slot picker

