

## Add Typing Indicator to Email Reply Area

**Problem**: The `useAgentTyping` hook (which updates `chat_typing_indicators` in Supabase) is only used in `ChatReplyInput` (live chat). The email `ReplyArea` component does not call it, so the presence avatar never changes from green (viewing) to amber (typing) when an agent is composing an email reply.

### Changes

**`src/components/dashboard/conversation-view/ReplyArea.tsx`**:

1. Import `useAgentTyping` from `@/hooks/useAgentTyping`
2. Call `useAgentTyping({ conversationId: conversation?.id ?? null })` to get `handleTyping` and `stopTyping`
3. On the textarea's `onChange` (or `onInput`) event, call `handleTyping()` alongside existing logic
4. Call `stopTyping()` when:
   - The reply is sent (inside `handleSendReply`, before or after dispatch)
   - The reply area is closed/cancelled
   - Component unmounts (already handled by `useAgentTyping` cleanup)

This reuses the exact same hook the live chat uses, so the presence system picks it up automatically -- the `useConversationTypingStatus` hook already listens to `chat_typing_indicators` changes for all conversations.

