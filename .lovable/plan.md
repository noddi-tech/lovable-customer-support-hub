

# Fix: Always Enforce Group Selection for Multi-Group Users

## Problem
When a multi-group user verifies their phone, the AI tool-calling loop runs `lookup_customer`, gets back `needs_group_selection: true`, but then immediately calls `lookup_customer` again with a guessed/default `user_group_id` -- all within the same loop. The `patchGroupSelect` post-processor never fires because by the time the loop ends, the latest tool result has actual bookings (not `needs_group_selection`).

## Changes

### 1. Break the tool loop when `needs_group_selection` is detected

**File**: `supabase/functions/widget-ai-chat/index.ts` (lines 2362-2376)

After each tool result is pushed to `currentMessages`, check if it contains `needs_group_selection`. If so, set `loopBroken = true` and break immediately -- preventing the AI from auto-selecting a group.

```typescript
currentMessages.push({
  role: 'tool',
  content: result,
  tool_call_id: toolCall.id,
});

// Force-break if group selection is needed
try {
  const parsed = JSON.parse(result);
  if (parsed.needs_group_selection && parsed.user_groups) {
    console.log('[widget-ai-chat] Group selection required, breaking tool loop');
    loopBroken = true;
    break;
  }
} catch {}
```

The existing `loopBroken` padding logic (lines 2377-2394) will handle padding any unanswered tool calls, and the final `tool_choice: "none"` call will produce a text reply that `patchGroupSelect` can then replace with the dropdown.

### 2. Add group selection awareness to the verification prompt

**File**: `supabase/functions/widget-ai-chat/index.ts` (line 2245)

Update the `__VERIFIED__` replacement message to include:

```
If I belong to multiple user groups, STOP and wait for me to select one -- do NOT auto-select a group.
```

This provides a soft instruction alongside the hard loop break.

## Technical Details

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | 1) Add `needs_group_selection` check after tool result push to force-break the loop 2) Update `__VERIFIED__` prompt text to mention group selection |

## Expected Results
- Single group users: auto-selected as before, no change in behavior
- Multi-group users: tool loop breaks immediately, `patchGroupSelect` fires, user sees "Hei, [Name]! Vi ser at du har flere brukergrupper..." with dropdown
- After selecting a group, `lookup_customer` is called with the specific `user_group_id` and bookings are shown
- Applies to ALL action flows (cancel, change time, new booking, etc.)

