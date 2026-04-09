

# Add "Learning from this response..." Indicator to Chat Reply

## Problem
When an agent selects an AI suggestion in chat, the "Learning from this response..." banner (visible in email's ReplyArea) doesn't appear in `ChatReplyInput`. The context already sets `trackingActive: true` when `SET_SELECTED_AI_SUGGESTION` is dispatched, but the chat component never reads or renders it.

## Change

### Edit: `src/components/conversations/ChatReplyInput.tsx`
- Add `Database` to the lucide-react imports
- Above the textarea (and below the `FeedbackPrompt`), add the same tracking indicator from ReplyArea:
  ```tsx
  {state.trackingActive && (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-md">
      <Database className="h-3 w-3 text-primary animate-pulse" />
      <span className="text-xs text-primary font-medium">
        Learning from this response...
      </span>
    </div>
  )}
  ```
- Place it right after `<FeedbackPrompt />` (line ~504), before the AI Suggestion Cards section
- Reset tracking after send: in `onSuccess` of `sendMessageMutation`, dispatch `SET_TRACKING_ACTIVE` with `false` (same as email flow)

One file changed, ~10 lines added.

