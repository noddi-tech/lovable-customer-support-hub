

## Re-introduce Activity Presence Avatars Across All Views

### Problem
The presence avatar stack — which shows which agents are currently viewing a conversation — is no longer visible. While the `PresenceAvatarStack` component exists in the `ConversationListItem` and `ConversationViewContent`, it's completely missing from the **ChatListItem** (chat conversations list). Additionally, the presence system may not be connecting reliably, causing the avatars to render as `null` even where they are wired up.

### Changes

**1. `src/components/dashboard/chat/ChatListItem.tsx`** — Add `PresenceAvatarStack` to the chat list items:
- Import `PresenceAvatarStack`
- Add it next to the time/unread indicator area so agents can see who else is viewing each chat conversation

**2. `src/components/dashboard/conversation-view/ConversationViewContent.tsx`** — Add a visible presence indicator with connection feedback:
- Add a small "connected" dot or fallback text near the presence stack so it's clear the system is active
- If `isPresenceConnected` is false, show a subtle reconnecting indicator

**3. `src/contexts/ConversationPresenceContext.tsx`** — Add console logging for debugging:
- Add a `console.log` when the organization ID is fetched and when the channel connects, so we can diagnose if the presence system is silently failing (the current `logger.debug` calls are suppressed in production)

**4. `src/components/conversations/PresenceAvatarStack.tsx`** — Show the current user's avatar even when they're the only viewer:
- Currently returns `null` when `sortedViewers.length === 0`. The current user should always appear if they're tracked on this conversation. Verify the component renders the current user's presence correctly.

### Layout (ChatListItem addition)
```text
┌──────────────────────────────────────┐
│ [Avatar] Customer Name    [👤👤] 5m │
│          email@...                   │
│          ✓ Preview text...           │
└──────────────────────────────────────┘
                            ↑ presence avatars
```

### Files changed

| File | Change |
|---|---|
| `src/components/dashboard/chat/ChatListItem.tsx` | Add `PresenceAvatarStack` import and render |
| `src/components/dashboard/conversation-view/ConversationViewContent.tsx` | Add connection status indicator near presence stack |
| `src/contexts/ConversationPresenceContext.tsx` | Add visible console logs for presence connection debugging |

