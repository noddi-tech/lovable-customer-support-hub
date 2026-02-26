
## Auto-close on Agent Reply, Auto-open on Customer Reply

### Problem
When an agent replies, the conversation stays in "Open" (defaults to "Pending"). When a customer replies to an existing closed conversation, it stays closed. This creates a poor workflow where agents must manually manage status.

### Changes

#### 1. Default reply status to "closed"
**File: `src/components/dashboard/conversation-view/ReplyArea.tsx` (line 65)**

Change the default `replyStatus` from `'pending'` to `'closed'`:
```typescript
const [replyStatus, setReplyStatus] = React.useState<string>('closed');
```

The agent can still override this via the dropdown before sending, but the default behavior will be to close the conversation on reply.

#### 2. Reopen conversation when customer replies to existing thread
**File: `supabase/functions/email-webhook/index.ts` (after line 184)**

After finding an existing conversation (i.e., not creating a new one), update its status to `'open'` and `is_read` to `false`:
```typescript
// Existing conversation found - reopen it on customer reply
await supabaseClient
  .from('conversations')
  .update({ status: 'open', is_read: false, updated_at: new Date().toISOString() })
  .eq('id', conversation.id);
```

#### 3. Reopen conversation when customer sends a widget chat message
**File: `supabase/functions/widget-chat/index.ts`**

In `handleSendMessage`, after inserting the customer message, update the conversation status to `'open'` if it was previously closed/pending.

### Result
- Agent sends reply -> conversation moves to "Closed" (disappears from Open inbox)
- Customer replies via email or chat -> conversation moves back to "Open" (appears in Open inbox)
- Agent can still manually choose a different status (Pending/Open) from the dropdown before sending
