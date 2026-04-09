

# Fix AI Suggestion Learning/Tracking in Chat

## Problem
When an agent uses an AI suggestion in chat (via `ChatReplyInput`), the system doesn't track that the response came from AI and doesn't show the feedback prompt. This means no `response_tracking` record is created, no learning happens.

**Root cause**: `ChatReplyInput` has its own `sendMessageMutation` that bypasses the context's tracking logic. It never dispatches `SET_SELECTED_AI_SUGGESTION`, so:
1. The context doesn't know an AI suggestion was selected
2. No `response_tracking` row is inserted on send
3. The `FeedbackPrompt` never appears (it checks `state.showFeedbackRating`)

In contrast, `ReplyArea` (email) dispatches `SET_SELECTED_AI_SUGGESTION` on "Use as-is"/"Refine", and uses the context's `sendReply` which checks `state.selectedAiSuggestion` to create a `response_tracking` record and trigger the feedback prompt.

## Changes

### Edit: `src/components/conversations/ChatReplyInput.tsx`

1. **Get `dispatch` from context**: Extract `dispatch` from `useConversationView()` (already available via the context)

2. **Dispatch `SET_SELECTED_AI_SUGGESTION` in `handleUseAsIs`**: After setting the message text, dispatch `SET_SELECTED_AI_SUGGESTION` with the suggestion text — same as ReplyArea does

3. **Dispatch `SET_SELECTED_AI_SUGGESTION` in `handleRefineAndUse`**: After refining, dispatch with the refined text

4. **Add response tracking to `sendMessageMutation`**: After inserting the message, check if `state.selectedAiSuggestion` is set. If so, insert a `response_tracking` record with `response_source: 'ai_suggestion'` and the message ID — same logic as in `ConversationViewContext.sendReplyMutation`

5. **Trigger feedback prompt on success**: In `onSuccess`, if an AI suggestion was used, dispatch `SET_FEEDBACK_STATE` with `show: true` and the message ID. Then reset the AI suggestion state

6. **Render `FeedbackPrompt`**: Import and render the `FeedbackPrompt` component above or below the suggestion cards area so agents see the feedback UI after sending an AI-assisted reply

## Technical details
- `dispatch` is already available from `useConversationView()` — just needs destructuring
- `FeedbackPrompt` is self-contained (reads its own state from context, has dismiss button)
- The `response_tracking` insert uses `state.selectedAiSuggestion` to find the matching suggestion metadata (same pattern as the email flow in `ConversationViewContext` lines ~358-402)
- No backend changes needed — same `response_tracking` table and `submit-feedback` function

