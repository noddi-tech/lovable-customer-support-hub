

# Fix: Back Button in Conversation Header Does Nothing

## Problem
The "Back to Inbox" button in `ConversationHeader.tsx` navigates to `'/'` with `replace: true`. When a user arrives from an external link (e.g. Slack's "View Conversation"), there's no meaningful history. Navigating to `/` just redirects to `/interactions/text/open`, but since `replace: true` is used, the user may end up in a loop or see no visible change.

## Fix
**File: `src/components/dashboard/conversation-view/ConversationHeader.tsx`** (line 81)

Change the back button to navigate to the conversation's inbox list view instead of `/`:

```typescript
// Before
onClick={() => navigate('/', { replace: true })}

// After — navigate to the correct interactions list
onClick={() => navigate(-1)}
```

However, `navigate(-1)` won't work when arriving from an external link (no history). A more robust approach: detect whether there's app history to go back to, and if not, fall back to the interactions list route:

```typescript
onClick={() => {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate('/interactions/text/open');
  }
}}
```

This ensures the back button always works — using browser history when available, and falling back to the inbox list when arriving from an external link.

