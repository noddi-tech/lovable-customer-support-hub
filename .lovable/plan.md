# Fix: success toast + UI clear only after the send actually resolves

## Problem
`ReplyArea.handleSendReply` clears the composer, closes the reply area, clears attachments, navigates back, and fires `toast.success('Reply sent')` synchronously at click-time — before `sendReplyMutation` resolves. On an upload-abort (e.g. avif), the user sees "Reply sent" flash, the conversation closes, then an error toast appears with no way to recover the draft. This falsely asserts success and silently destroys the agent's in-flight reply.

## Goal
- Happy path: identical end state — composer cleared, reply area closed, conversation list, one "Reply sent" toast.
- Failure path: agent stays on the OPEN conversation, composer text intact, attachment chips intact, reply area still open, only the error toast appears.

## Changes (2 files)

### 1. `src/components/dashboard/conversation-view/ReplyArea.tsx` (`handleSendReply`, ~lines 166–209)

Stop clearing UI / showing toast / navigating at click-time. Keep `stopTyping()` (cosmetic), then await the mutation. Only on success do we clear composer state, attachments, mentions, close the reply area, and `clearConversation()`. On error: do nothing — context's `onError` already shows the toast and preserves `replyText`; `attachments`, `mentionedUserIds`, and `showReplyArea` remain untouched, so the agent lands back in the open conversation with their draft + chips.

Diff (conceptual):
```diff
 const handleSendReply = () => {
   if (!state.replyText.trim()) return;

   const replyText = state.replyText;
   const isInternal = state.isInternalNote;
   const currentMentionedUserIds = [...mentionedUserIds];
   const conversationIdForMentions = conversation?.id;
   const currentAttachments = [...attachments];

   stopTyping();

-  // IMMEDIATELY clear UI, show toast, and navigate (optimistic UX)
-  dispatch({ type: 'SET_REPLY_TEXT', payload: '' });
-  dispatch({ type: 'SET_SHOW_REPLY_AREA', payload: false });
-  dispatch({ type: 'SET_IS_INTERNAL_NOTE', payload: false });
-  setMentionedUserIds([]);
-  setAttachments([]);
-  toast.success(isInternal ? 'Internal note added' : 'Reply sent');
-  clearConversation();
-
-  // Fire mutation in background (non-blocking)
   sendReply(replyText, isInternal, replyStatus, currentAttachments.map(a => a.file), replyAll)
     .then((messageId) => {
+      // Send (incl. all uploads) succeeded — now safe to clear UI + navigate.
+      dispatch({ type: 'SET_REPLY_TEXT', payload: '' });
+      dispatch({ type: 'SET_SHOW_REPLY_AREA', payload: false });
+      dispatch({ type: 'SET_IS_INTERNAL_NOTE', payload: false });
+      setMentionedUserIds([]);
+      setAttachments([]);
+      clearConversation();
+
       if (isInternal && currentMentionedUserIds.length > 0 && conversationIdForMentions) {
         processMentions(replyText, currentMentionedUserIds, {
           type: 'internal_note',
           conversation_id: conversationIdForMentions,
           message_id: messageId,
         });
       }
     })
     .catch((error) => {
-      // Error toast is handled by mutation's onError in context
+      // Error toast handled by mutation's onError in context.
+      // Intentionally do NOT clear composer / attachments / showReplyArea —
+      // agent stays on the open conversation with their draft + chips intact.
       console.error('Reply failed in background:', error);
     });
 };
```

Note: attachments and `mentionedUserIds` live as local state in `ReplyArea`, so the clear must happen here (not in context). Context owns the success toast + cache write.

### 2. `src/contexts/ConversationViewContext.tsx` (`sendReplyMutation.onSuccess`, ~line 497)

Fire the success toast here, after the mutation actually resolved.

Diff:
```diff
-    onSuccess: (newMessage) => {
+    onSuccess: (newMessage, variables) => {
       dispatch({ type: 'SET_REPLY_TEXT', payload: '' });
       dispatch({ type: 'SET_SELECTED_AI_SUGGESTION', payload: null });
       dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: null });

       queryClient.setQueryData(['messages', conversationId, user?.id], (old: any[]) => {
         return old ? [...old, newMessage] : [newMessage];
       });
       queryClient.refetchQueries({ queryKey: ['thread-messages'], exact: false });
       queryClient.invalidateQueries({ queryKey: ['all-counts'] });
-      // Toast is now shown immediately in ReplyArea.tsx for instant feedback
+      // Fire success toast only after the send (incl. all uploads) resolved —
+      // guarantees we never claim success on an aborted upload.
+      toast.success(variables.isInternal ? 'Internal note added' : 'Reply sent');
     },
```

(The duplicate `SET_REPLY_TEXT: ''` in onSuccess is harmless — ReplyArea also clears on success; both run when the promise resolves.)

## Untouched (explicit)
- `mutationFn` (upload loop + abort-on-failure throw)
- `onError` (upload-abort vs send-failed messaging, `replyText` preservation)
- `ChatReplyInput.tsx` and the `chat-attachments` bucket
- `useNoteMutations` / any other path

## Verification
a. **Happy path** — type reply + send → server resolves → exactly one "Reply sent" toast, composer clears, reply area closes, navigates back to list. No flicker, no double toast.
b. **Forced failure** (attach a file that the bucket rejects, or kill network on the upload POST) → only the upload-abort error toast appears; "Reply sent" never shows; agent **stays on the open conversation**; composer text intact; attachment chips intact; reply area still open; no `messages` row inserted; no `send-reply-email` invocation. Removing the bad attachment and clicking Send again succeeds normally.
c. **Internal note happy path** → "Internal note added" appears once, after success; mentions still process.
