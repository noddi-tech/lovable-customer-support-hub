
# Add User Group Select Block with Dropdown Component

## Problem
When a customer belongs to multiple user groups, the AI currently outputs plain text asking them to choose. There is no interactive UI component for this -- the user wants a proper Select dropdown (like the Radix Select component) rendered inline in the chat.

## Solution
Create a new `[GROUP_SELECT]` block that renders a styled Select dropdown inside the chat bubble. When the user picks a group, it fires the `lookup_customer` tool again with the selected `user_group_id`.

## Changes

### 1. New file: `src/widget/components/blocks/GroupSelectBlock.tsx`

Create a new block component that:
- Parses a JSON payload containing group options: `[GROUP_SELECT]{"groups":[{"id":123,"name":"Joachim Rathke"},{"id":456,"name":"Lomundal Oslo AS"}]}[/GROUP_SELECT]`
- Renders a native `<select>` dropdown (not Radix Select, since the widget uses inline styles for isolation and doesn't have access to Tailwind/Radix in the shadow DOM context)
- Styled with inline styles matching the widget design (border, rounded corners, primary color accent)
- Shows a placeholder like "Velg gruppe..." / "Select group..."
- On selection, calls `onAction(JSON.stringify({ user_group_id: selectedId, name: selectedName }), blockKey)` which sends the selection as a hidden message to trigger the AI to re-call `lookup_customer` with the chosen group ID
- Once used, shows a confirmation badge (like the phone verify block) showing the selected group name

Register the block:
```typescript
registerBlock({
  type: 'group_select',
  marker: '[GROUP_SELECT]',
  closingMarker: '[/GROUP_SELECT]',
  parseContent: (inner) => {
    try { return JSON.parse(inner.trim()); } 
    catch { return { groups: [] }; }
  },
  component: GroupSelectBlock,
  flowMeta: {
    label: 'Group Select',
    icon: '👥',
    description: 'Dropdown to choose which user group to manage.',
  },
});
```

### 2. Update `src/widget/components/blocks/index.ts`

Add the import:
```typescript
import './GroupSelectBlock';
```

### 3. Update `supabase/functions/widget-ai-chat/index.ts` -- Post-processor

Add a new post-processor `patchGroupSelect` that detects when `needs_group_selection` is present in the most recent `lookup_customer` tool result and auto-injects the `[GROUP_SELECT]` marker with the group options JSON. This ensures the dropdown always appears regardless of what the AI writes.

```typescript
function patchGroupSelect(reply: string, messages: any[]): string {
  if (reply.includes('[GROUP_SELECT]')) return reply;
  
  // Find most recent lookup_customer tool result with needs_group_selection
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'tool') {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.needs_group_selection && parsed.user_groups) {
          const payload = JSON.stringify({ groups: parsed.user_groups });
          // Replace the AI's plain text with the marker
          return `${reply}\n[GROUP_SELECT]${payload}[/GROUP_SELECT]`;
        }
      } catch {}
    }
  }
  return reply;
}
```

Add this to the post-processor pipeline (before `patchActionMenu`).

### 4. Update AI system prompt

Add instruction that when `needs_group_selection` is returned, the AI should greet the customer by name and explain they need to select which group they want help with. The post-processor will handle injecting the actual `[GROUP_SELECT]` component.

## Select Component Design (inline styles)

Since the widget runs in isolation and cannot use Radix/Tailwind, the select will be a styled native `<select>` element:

```tsx
<select
  value={selected}
  onChange={(e) => handleSelect(e.target.value)}
  disabled={isUsed}
  style={{
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1.5px solid ${primaryColor}`,
    fontSize: '14px',
    background: '#fff',
    color: '#1a1a1a',
    cursor: isUsed ? 'default' : 'pointer',
    appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,...")', // chevron icon
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
  }}
>
  <option value="" disabled>Velg gruppe...</option>
  {groups.map(g => (
    <option key={g.id} value={g.id}>{g.name}</option>
  ))}
</select>
```

After selection, a confirm button appears (styled like the phone verify submit button) to confirm the choice.

## File Changes Summary

| File | Change |
|------|--------|
| `src/widget/components/blocks/GroupSelectBlock.tsx` | New file: Select dropdown block for user group selection |
| `src/widget/components/blocks/index.ts` | Add import for GroupSelectBlock |
| `supabase/functions/widget-ai-chat/index.ts` | Add `patchGroupSelect` post-processor to auto-inject the block when `needs_group_selection` is detected |

## Expected Result
When a customer with multiple user groups verifies their phone, they see a styled dropdown listing their groups. After selecting one, the AI re-runs `lookup_customer` with the chosen `user_group_id` and proceeds with bookings from that group only.
