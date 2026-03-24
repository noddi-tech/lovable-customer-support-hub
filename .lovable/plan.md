

## Fix: Add "Note" Badge to ConversationTableRow

### Problem
The "Note" badge for `last_message_is_internal` was added to `ConversationListItem.tsx` (card view) and `ChatListItem.tsx`, but **not** to `ConversationTableRow.tsx` — which is the table view the user is actually looking at in the screenshot.

### Fix

**File: `src/components/dashboard/conversation-list/ConversationTableRow.tsx`**

1. Add `Lock` to the lucide-react imports
2. In the Subject cell (around line 214), after the "New" badge and before the hover reply button, add:

```tsx
{conversation.last_message_is_internal && (
  <Badge className="px-1.5 py-0 text-[10px] shrink-0 bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
    <Lock className="h-3 w-3 mr-0.5" />
    Note
  </Badge>
)}
```

3. Same badge in the second render path (div-based row, around line 325) in the same position

This matches the styling already used in `ConversationListItem.tsx` and `ChatListItem.tsx`.

| File | Change |
|------|--------|
| `ConversationTableRow.tsx` | Add `Lock` import + "Note" badge in both render paths (table row and div row) |

