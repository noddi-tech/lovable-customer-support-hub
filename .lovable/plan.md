

## Remove Redundant Green Dots in Chat View

The screenshot shows two green dots next to the agent activity avatar in the chat header. These are:

1. **Presence connection status dot** (line 270-274 in `ConversationViewContent.tsx`) — a tiny `1.5x1.5` green circle indicating the presence system is connected
2. **The agent activity avatar** itself already has a green ring indicating "Viewing"

The connection status dot is redundant now that the avatar is working correctly. The avatar's green ring already signals the presence system is active.

### Changes

| File | Change |
|---|---|
| `src/components/dashboard/conversation-view/ConversationViewContent.tsx` | Remove the presence connection status `<span>` dot (lines 269-274) next to the `PresenceAvatarStack` in the chat header. Keep the `PresenceAvatarStack` itself. The wrapping `<div>` can be simplified since it no longer needs `gap-1.5`. |

One small change — just delete the green dot indicator, keep the avatar stack.

