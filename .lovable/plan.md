

## Fix: Conversation not closing after reply

### Root Cause
The conversation status update in `ChatReplyInput.tsx` (line 162-171) doesn't check for errors. The Supabase `.update()` call silently fails — the result is discarded without checking for an error response. This means if RLS blocks the update or any other issue occurs, the agent sees no feedback and the conversation stays `open`.

Verified in the database: the conversation `600f86eb...` is still `status: 'open'` despite the agent replying with "Send & Close" selected.

### Fix

**`src/components/conversations/ChatReplyInput.tsx`**:

1. **Add error handling** to the conversation update call — check the `error` response and throw if it fails, so `onError` can show a toast
2. **Add console logging** before and after the update to trace exactly what's happening (`replyStatus` value, `conversationId`, result)
3. **Also invalidate `conversation-meta`** in `onSuccess` so the conversation view header updates

The change at lines 162-171:
```typescript
if (replyStatus !== 'open') {
  console.log('[ChatReplyInput] Updating conversation status:', { conversationId, replyStatus });
  const { error: statusError } = await supabase
    .from('conversations')
    .update({ 
      status: replyStatus,
      is_read: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);
  
  if (statusError) {
    console.error('[ChatReplyInput] Failed to update conversation status:', statusError);
    throw new Error(`Failed to update status: ${statusError.message}`);
  }
  console.log('[ChatReplyInput] Conversation status updated successfully to:', replyStatus);
}
```

And in `onSuccess`, add:
```typescript
queryClient.invalidateQueries({ queryKey: ['conversation-meta', conversationId] });
queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
```

### File changed

| File | Change |
|---|---|
| `src/components/conversations/ChatReplyInput.tsx` | Add error handling + logging to status update, invalidate conversation-meta |

