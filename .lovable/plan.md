

# Add "Awaiting Reply" Badge to Conversation Lists

## Problem
When an agent reads a conversation but doesn't reply, it loses the "unread" indicator and blends in with answered conversations. There's no visual cue that the latest message is from the customer and still needs an agent response.

## Approach
Mirror the existing `last_message_is_internal` pattern: add a `last_message_sender_type` column to `conversations`, set it via the existing trigger, and render a badge in all list views.

## Changes

### 1. Database migration
- Add column: `ALTER TABLE conversations ADD COLUMN last_message_sender_type text DEFAULT 'agent'`
- Update `update_conversation_preview()` trigger to also set `last_message_sender_type = NEW.sender_type` on each message insert
- Backfill from the most recent message per conversation:
  ```sql
  UPDATE conversations c SET last_message_sender_type = (
    SELECT m.sender_type FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC LIMIT 1
  )
  ```

### 2. Update the `list_conversations_optimized` RPC
- In the migration that defines this function, add `c.last_message_sender_type` to the SELECT and return type

### 3. Frontend type: `ConversationListContext.tsx`
- Add `last_message_sender_type?: string` to the `Conversation` interface

### 4. Badge rendering (4 files, same pattern)
Show an "Awaiting Reply" badge when `last_message_sender_type === 'customer'` AND the conversation is not internal-note AND status is `open` or `pending`. Uses a blue/orange style to stand out.

- **`ConversationListItem.tsx`** — after the Note badge block (~line 196)
- **`ConversationTableRow.tsx`** — in all 3 render modes (compact ~line 243, default ~line 303, expanded ~line 421)
- **`ChatListItem.tsx`** — after the Note badge (~line 114)

Badge markup (same everywhere):
```tsx
{conversation.last_message_sender_type === 'customer' && 
 !conversation.last_message_is_internal && 
 (conversation.status === 'open' || conversation.status === 'pending') && (
  <Badge className="px-1.5 py-0 text-[10px] shrink-0 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
    <Clock className="h-3 w-3 mr-0.5" />
    Awaiting reply
  </Badge>
)}
```

### 5. Supabase types
- Regenerate or manually add `last_message_sender_type` to `types.ts`

## Technical notes
- The trigger already fires on every message insert, so adding one more column assignment is zero overhead
- No new RLS policies needed — the column inherits the row's existing policy
- The badge only shows for open/pending conversations to avoid noise on closed ones
- `sender_type` values in the messages table are `'customer'` and `'agent'`

