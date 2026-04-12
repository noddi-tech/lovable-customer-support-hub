

# Fix: Back Button Not Working in Conversation View

## Problem
The "← Back" button in `ConversationViewContent.tsx` uses `navigate(-1)`, which fails when the user arrives directly via an external link (e.g., Slack notification). The browser has no meaningful history entry to go back to, so nothing happens.

## Fix
**File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx`** (lines 162-165)

Replace the naive `navigate(-1)` with a deterministic fallback to the interactions list:

```typescript
const navigateBack = useNavigate();
const handleBack = () => {
  if (window.history.state?.idx > 0) {
    navigateBack(-1);
  } else {
    navigateBack('/interactions/text/open');
  }
};
```

React Router stores an `idx` in history state — if it's `0`, the user landed directly on this page (no app history to go back to). This is more reliable than checking `window.history.length`, which is always ≥ 1.

This same fix applies to both the email UI back button (line 370) and the live chat UI back button (line 202) since they share the same `handleBack` function.

One function change, no new files.

