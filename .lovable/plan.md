

# Fix: Group Select Flow, AI Text Replacement, and Re-lookup Logic

## Root Causes

### Problem 1: AI says "no active bookings" above the group selector
The `patchGroupSelect` post-processor **appends** the `[GROUP_SELECT]` marker below whatever the AI wrote. Since the `needs_group_selection` response contains no bookings, the AI writes "Du har ingen aktive bestillinger" -- then the dropdown appears underneath that misleading text.

**Fix**: `patchGroupSelect` must **replace** the entire AI reply with a proper prompt text + the `[GROUP_SELECT]` marker, not append.

### Problem 2: After selecting a group, it shows "no bookings" again + another dropdown
Two sub-problems:
- The hidden message sent after group selection (`{"user_group_id":123,"name":"..."}`) doesn't instruct the AI to re-call `lookup_customer` with that group ID. The AI doesn't know what to do.
- The `patchGroupSelect` scans **all** tool results in conversation history. The old `needs_group_selection: true` result from a previous turn is still there, so the post-processor injects another `[GROUP_SELECT]` on every subsequent reply.

**Fix**:
1. Update the system prompt to include explicit instructions about handling `needs_group_selection` results and re-calling `lookup_customer` with the selected `user_group_id`.
2. Make `patchGroupSelect` only look at tool results from the **current** turn (not all history). If the most recent assistant reply already follows a group selection action, skip injection.
3. In `handleActionSelect` in AiChat.tsx (or in the hidden message text), include a clear instruction prefix so the AI knows the user picked a group and should re-call `lookup_customer`.

## Changes

### 1. Fix `patchGroupSelect` to replace AI text (not append)

**File**: `supabase/functions/widget-ai-chat/index.ts`

```typescript
function patchGroupSelect(reply: string, messages: any[]): string {
  if (reply.includes('[GROUP_SELECT]')) return reply;
  
  // Only check the LAST tool result (not all history) to avoid re-triggering on old results
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    // Stop searching if we hit an assistant message (we've gone past current turn's tool results)
    if (msg.role === 'assistant') break;
    if (msg.role === 'tool') {
      try {
        const parsed = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
        if (parsed.needs_group_selection && parsed.user_groups) {
          const customerName = parsed.customer?.name || '';
          const payload = JSON.stringify({ groups: parsed.user_groups });
          // REPLACE the entire reply with a proper prompt + the group select block
          const greeting = customerName 
            ? `Hei, ${customerName}! Vi ser at du har flere brukergrupper tilknyttet din konto. Hvem vil du representere?`
            : `Vi ser at du har flere brukergrupper tilknyttet din konto. Hvem vil du representere?`;
          return `${greeting}\n[GROUP_SELECT]${payload}[/GROUP_SELECT]`;
        }
      } catch {}
    }
  }
  return reply;
}
```

Key changes:
- **Replace** the AI text entirely instead of appending
- **Stop at the previous assistant message** so old `needs_group_selection` results from earlier turns don't trigger another dropdown
- Include a friendly Norwegian greeting with the customer's name

### 2. Improve the hidden message sent after group selection

**File**: `src/widget/components/blocks/GroupSelectBlock.tsx`

Update `handleConfirm` to send a clearer action payload that the AI can understand:

```typescript
const handleConfirm = () => {
  if (!selected) return;
  const group = groups.find(g => String(g.id) === selected);
  if (!group) return;
  setConfirmed(true);
  // Include a clear instruction for the AI
  const payload = JSON.stringify({ 
    user_group_id: group.id, 
    name: group.name,
    action: 'group_selected'
  });
  onAction(payload, blockKey);
};
```

### 3. Add system prompt instructions for group selection handling

**File**: `supabase/functions/widget-ai-chat/index.ts` (system prompt section)

Add to the system prompt instructions that explain the group selection flow:

```
## User Group Selection Flow
When lookup_customer returns needs_group_selection: true, a [GROUP_SELECT] dropdown is automatically shown to the user.
When the user selects a group, you will receive a message containing "user_group_id" and "group_selected".
You MUST then call lookup_customer again with the user_group_id parameter to fetch that group's bookings.
Do NOT say "no bookings" before the user has selected a group.
```

### 4. Handle group selection action in the edge function tool dispatch

**File**: `supabase/functions/widget-ai-chat/index.ts`

In the message processing logic, detect when the user's hidden message contains `group_selected` and ensure the AI understands it should re-run `lookup_customer`. This may require updating the tool-calling logic or adding a pre-processor that parses the group selection payload and injects it as context.

## File Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | 1) `patchGroupSelect`: replace AI text instead of appending; scope to current turn only 2) Add system prompt instructions for group selection flow 3) Ensure tool dispatch handles `user_group_id` parameter correctly |
| `src/widget/components/blocks/GroupSelectBlock.tsx` | Add `action: 'group_selected'` to payload for clearer AI instruction |

## Expected Results
1. When phone is verified and multiple groups exist: "Hei, Joachim! Vi ser at du har flere brukergrupper tilknyttet din konto. Hvem vil du representere?" + dropdown
2. After selecting "Joachim Rathke (Personlig)": AI calls `lookup_customer` with `user_group_id` and shows the bookings for that group
3. No repeated dropdown on subsequent messages
