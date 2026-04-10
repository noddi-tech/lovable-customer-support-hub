

# Fix: Conversation Click Redirects to Wrong Inbox

## Root Cause

The bug is in `EnhancedInteractionsLayout.tsx` lines 119-123. Here's what happens:

1. User clicks a conversation in Tronderdekk inbox
2. Navigation goes to `/interactions/text/conversations/:id` (no `?inbox=` query param)
3. The `useEffect` on line 119 fires: `!inbox` is true (no query param on conversation URL), `!selectedInboxId` may also be true
4. It calls `navigationSetInbox(inboxes[0].id)` which navigates to `/interactions/text/open?inbox=<first-inbox>` (Noddi)
5. This kicks the user out of the conversation view back to the list -- causing the flicker

The `setInbox` function navigates to the **list** route, so calling it during a detail view destroys the conversation view.

## Fix

One-line change: skip the default-inbox effect when already viewing a conversation detail (`isDetail` is true).

**File**: `src/components/dashboard/EnhancedInteractionsLayout.tsx`

```typescript
// Line 119-123: Add isDetail guard
useEffect(() => {
  if (!isDetail && !inbox && !selectedInboxId && inboxes.length > 0) {
    navigationSetInbox(inboxes[0].id);
  }
}, [isDetail, inbox, selectedInboxId, inboxes, navigationSetInbox]);
```

This prevents the redirect when the user is viewing a conversation, while still setting a default inbox on the list view.

