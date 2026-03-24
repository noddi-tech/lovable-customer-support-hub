

## Highlight Conversations Where Last Action is an Internal Note

### Problem
When an agent leaves an internal note on a conversation, there's no visual indicator in the conversation list. The `preview_text` column intentionally skips internal notes, so the list shows the last customer/agent message — hiding the fact that someone left a note that may need follow-up.

### Solution
Add a `has_pending_note` indicator that shows when the most recent message on a conversation is an internal note. Display a small badge in the conversation list so agents can spot these at a glance.

### Changes

**1. Database: Add `last_message_is_internal` column + update trigger**

- Add `last_message_is_internal BOOLEAN DEFAULT false` to `conversations` table
- Update the existing `update_conversation_preview()` trigger function to also track whether the newest message is internal:
  - On any message INSERT: set `last_message_is_internal = NEW.is_internal` on the parent conversation
  - This naturally flips to `false` when a customer or agent sends a non-internal reply, and `true` when a note is added

**2. Frontend: Show "Note" badge in conversation list**

- `ConversationListItem.tsx`: Read `conversation.last_message_is_internal` (cast from the RPC result). When true, show a small amber/yellow badge with a Lock icon and "Note" text — same visual language as internal notes in the message view
- `ChatListItem.tsx`: Same badge for the chat list view

**3. Database RPC: Return the new column**

- Update `get_conversations_with_session_recovery` to include `last_message_is_internal` in its return type and SELECT

**4. Type update**

- Add `last_message_is_internal?: boolean` to the `Conversation` type in `ConversationListContext.tsx`

### Visual result
In the conversation list row, between existing badges:
```
[Customer Name] • [Subject] ... [🔒 Note] [Open] [Normal] [email · Inbox · 2m ago]
```

The amber "Note" badge immediately tells agents: "someone left an internal note as the last action — check if follow-up is needed."

### Technical detail

Trigger update (pseudo-SQL):
```sql
ALTER TABLE conversations ADD COLUMN last_message_is_internal boolean DEFAULT false;

CREATE OR REPLACE FUNCTION update_conversation_preview() ...
  -- existing preview_text logic stays the same
  -- add: always update last_message_is_internal
  UPDATE conversations 
  SET last_message_is_internal = NEW.is_internal
  WHERE id = NEW.conversation_id;
```

RPC addition:
```sql
-- Add to RETURNS TABLE:
last_message_is_internal boolean
-- Add to SELECT:
c.last_message_is_internal
```

Frontend badge (in ConversationListItem):
```tsx
{conversation.last_message_is_internal && (
  <Badge className="px-1.5 py-0 text-xs bg-yellow-100 text-yellow-800">
    <Lock className="h-3 w-3 mr-0.5" />
    Note
  </Badge>
)}
```

