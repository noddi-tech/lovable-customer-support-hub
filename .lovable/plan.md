

# Add AI Suggestions to Chat Reply Input

## What this does
Adds the same "AI Suggest" button and suggestion flow to the `ChatReplyInput` component (used for chat conversations) that already exists in `ReplyArea` (used for email conversations). Agents will be able to click "AI Suggest", see suggestion cards, preview/refine them via the `AiSuggestionDialog`, and insert them into the reply textarea.

## Current state
- `ReplyArea` (email) has: AI Suggest button → calls `getAiSuggestions()` from context → shows suggestion cards → click opens `AiSuggestionDialog` → "Use as-is" or "Refine" → inserts into reply text
- `ChatReplyInput` (chat) has: no AI suggestion support at all
- Both components use `useConversationView()` context, which already exposes `getAiSuggestions`, `refineAiSuggestion`, and `state.aiSuggestions`/`state.aiLoading`

## Changes

### Edit: `src/components/conversations/ChatReplyInput.tsx`

1. **Import** `Sparkles`, `Eye`, `Star` icons, `Card`, `Badge`, `Label`, `AiSuggestionDialog` component
2. **Add state** for `selectedSuggestionForDialog` and `originalSuggestionText`
3. **Extract from context**: `getAiSuggestions`, `refineAiSuggestion`, `messages` (already has `state` via `useConversationView`)
4. **Add handler functions** (same pattern as ReplyArea):
   - `handleGetAiSuggestions` — calls `getAiSuggestions()`
   - `handleAiSuggestionSelect` — opens the dialog with the selected suggestion
   - `handleUseAsIs` — inserts suggestion into `message` state
   - `handleRefineAndUse` — calls `refineAiSuggestion`, updates dialog with refined text
5. **Add AI Suggest button** to the toolbar row (next to emoji/attachment/note buttons)
6. **Add suggestion cards** above the textarea (when `state.aiSuggestions.length > 0` and not internal note) — same card layout as ReplyArea
7. **Add `AiSuggestionDialog`** component render

The button and cards will match the existing email ReplyArea pattern exactly, reusing the same `AiSuggestionDialog` component and the same context methods.

## No other files need changes
- The `ConversationViewContext` already provides all the AI suggestion logic
- The `suggest-replies` edge function already works for any conversation type
- The `AiSuggestionDialog` component is already generic and reusable

