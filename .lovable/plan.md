

## Plan: Fix Notification "View" Navigation to Open the Correct Conversation

### Problem
Clicking "View" on a notification navigates to `/interactions/text/open?c=<id>`, which hardcodes the status filter to "open". If the conversation has a different status (e.g., pending, resolved, closed), it won't display — the user just sees the inbox list with no conversation opened.

Additionally, the notification rows themselves aren't clickable — only the small hover-revealed "View" button works, which is poor UX.

### Solution
1. **Use the existing `/c/:conversationId` redirect route** instead of hardcoding the path. This route (`ConversationRedirect`) looks up the conversation's actual status and inbox, then redirects to the correct URL (e.g., `/interactions/text/resolved?inbox=...&c=...&m=...`).

2. **Make the entire notification row clickable** so users don't need to find the hover "View" button.

### Changes

**`src/pages/NotificationsPage.tsx`** — Fix `handleNavigate`:
```typescript
// Before:
navigate(`/interactions/text/open?c=${data.conversation_id}${messageParam}`);

// After:
const messagePath = data.message_id ? `/m/${data.message_id}` : '';
navigate(`/c/${data.conversation_id}${messagePath}`);
```

**`src/components/notifications/NotificationListItem.tsx`** — Make the row clickable:
- Add `onClick={() => onNavigate(notification)}` to the outer `<div>` when a link target exists
- Add `cursor-pointer` class when navigable
- Keep the hover "View" button as a secondary action

**`src/hooks/useRealtimeNotifications.tsx`** — Fix toast action URL:
```typescript
// Use /c/ short link instead of hardcoded path
window.location.href = `/c/${notification.data.conversation_id}`;
```

### Files changed

| File | Change |
|---|---|
| `src/pages/NotificationsPage.tsx` | Use `/c/:id` route for conversation navigation |
| `src/components/notifications/NotificationListItem.tsx` | Make entire row clickable |
| `src/hooks/useRealtimeNotifications.tsx` | Fix toast action URL to use `/c/` route |

