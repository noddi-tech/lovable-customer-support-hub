

## Fix: End Chat Should Move Chat to "Ended" Tab

### Problem Summary

When clicking "End Chat":
1. The `widget_chat_sessions.status` is updated to `'ended'` (working)
2. But the `conversations.status` remains as `'pending'` (not updated!)
3. The "Active" tab filters by `conversations.status IN ('open', 'pending')`
4. Result: Chat stays in Active tab despite showing "Chat ended" toast

Additionally, the icon is a phone (wrong context) instead of a chat bubble.

---

## Part 1: Update Both Session AND Conversation Status

**File:** `src/components/conversations/ChatReplyInput.tsx`

In the `endChatMutation`, after updating the session, also update the conversation status:

```typescript
const endChatMutation = useMutation({
  mutationFn: async () => {
    // Find the chat session for this conversation
    const { data: session } = await supabase
      .from('widget_chat_sessions')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('status', 'active')
      .maybeSingle();

    // Update session status
    if (session) {
      const { error } = await supabase
        .from('widget_chat_sessions')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (error) throw error;
    }

    // ALSO update the conversation status to 'closed'
    const { error: convError } = await supabase
      .from('conversations')
      .update({ 
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (convError) throw convError;
  },
  onSuccess: () => {
    toast.success('Chat ended');
    // Invalidate both conversation and chat list queries
    queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    queryClient.invalidateQueries({ queryKey: ['chat-counts'] });
  },
  // ...
});
```

---

## Part 2: Change Icon to Chat Bubble

**File:** `src/components/conversations/ChatReplyInput.tsx`

Replace `PhoneOff` with a chat-appropriate icon:

```typescript
// At imports
import { MessageSquareX } from 'lucide-react';
// Or use: MessageCircleOff

// At line 377
<MessageSquareX className="h-4 w-4" />
```

---

## Part 3: Navigate Back to List After Ending

After ending a chat, the agent should be navigated back to the chat list since the conversation is now closed:

```typescript
import { useNavigate } from 'react-router-dom';

// Inside component
const navigate = useNavigate();

// In onSuccess callback
onSuccess: () => {
  toast.success('Chat ended');
  queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
  queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
  queryClient.invalidateQueries({ queryKey: ['chat-counts'] });
  
  // Navigate back to chat list (ended filter)
  navigate('/interactions/chat/ended');
},
```

---

## Part 4: Optional - Also Handle Session Not Found

If the session was already ended (e.g., visitor left), the mutation should still close the conversation:

```typescript
const endChatMutation = useMutation({
  mutationFn: async () => {
    // Try to find active session (may not exist if visitor already left)
    const { data: session } = await supabase
      .from('widget_chat_sessions')
      .select('id')
      .eq('conversation_id', conversationId)
      .in('status', ['active', 'waiting'])  // Also allow ending waiting chats
      .maybeSingle();

    // Update session if it exists
    if (session) {
      await supabase
        .from('widget_chat_sessions')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', session.id);
    }

    // Always close the conversation
    const { error: convError } = await supabase
      .from('conversations')
      .update({ 
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (convError) throw convError;
  },
  // ...
});
```

---

## Files Summary

| File | Changes |
|------|---------|
| `src/components/conversations/ChatReplyInput.tsx` | Update both session AND conversation status, change icon, navigate after ending |

---

## Expected Behavior After Fix

1. Agent clicks "End Chat" button (now with chat bubble icon)
2. Both `widget_chat_sessions.status` AND `conversations.status` are updated
3. Toast shows "Chat ended"
4. Query caches are invalidated
5. Agent is navigated to `/interactions/chat/ended`
6. The chat appears in "Ended" tab (with count updated)
7. The chat is removed from "Active" tab

---

## Testing Steps

1. Open an active chat conversation
2. Click the "End Chat" button
3. Verify toast "Chat ended" appears
4. Verify navigation to Ended tab
5. Verify the chat now appears in "Ended" tab
6. Verify the chat is NOT in "Active" tab anymore
7. Verify the count badges update correctly

