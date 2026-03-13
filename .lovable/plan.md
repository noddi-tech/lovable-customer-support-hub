

## Fix: Presence Avatars Not Rendering

### Root Cause Analysis

The presence system has two compounding issues:

1. **Silent failures hidden by `logger.debug`**: All critical presence lifecycle logs use `logger.debug` which is suppressed in production. Even though we added some `console.log` calls in the last edit, key failure paths (like `trackConversation` early return when channel/profile not ready) still use `logger.warn`/`logger.debug` which are invisible.

2. **Race condition**: `trackConversation` in `ConversationViewContent.tsx` (line 91) depends on `isPresenceConnected`. But `isPresenceConnected` comes from the context which re-renders the component, causing `trackConversation` to fire. However, `trackConversation` uses `channelRef.current` and `currentUserProfileRef.current` — these refs may not be set yet when the callback fires because the channel setup effect and the profile fetch are asynchronous.

3. **PresenceAvatarStack returns null when no viewers**: Even if the current user IS tracked, `viewersForConversation` might return empty because the sync event hasn't fired yet or the track call failed. The component returns `null` — no fallback.

### Changes

**1. `src/hooks/useConversationPresence.ts`** — Fix race condition and add visible logging:
- Replace ALL remaining `logger.debug`/`logger.warn` in critical paths with `console.log`/`console.warn` so failures are visible in production
- The `trackConversation` callback already uses refs (good), but add retry logic: if channel isn't ready, queue the conversation ID and track it when the channel subscribes

**2. `src/components/conversations/PresenceAvatarStack.tsx`** — Show current user as fallback:
- Accept an optional `showSelfFallback` prop (default `false`)
- When `showSelfFallback={true}` and `currentUserProfile` exists but `allViewers` is empty, show the current user's avatar anyway (they're viewing this conversation even if presence sync hasn't caught up)
- Use this in `ConversationViewContent.tsx` where we know the user IS viewing

**3. `src/components/dashboard/conversation-view/ConversationViewContent.tsx`** — Pass `showSelfFallback` to both PresenceAvatarStack instances (chat header line 263 and email header line 355)

**4. `src/components/dashboard/conversation-list/ConversationListItem.tsx`** — Already has PresenceAvatarStack, no change needed (list items don't need self-fallback)

**5. `src/components/dashboard/chat/ChatListItem.tsx`** — Already has PresenceAvatarStack, no change needed

### Files

| File | Change |
|---|---|
| `src/hooks/useConversationPresence.ts` | Replace logger.debug/warn with console.log at all critical points; add queued track retry on subscribe |
| `src/components/conversations/PresenceAvatarStack.tsx` | Add `showSelfFallback` prop to render current user avatar when viewersMap is empty |
| `src/components/dashboard/conversation-view/ConversationViewContent.tsx` | Pass `showSelfFallback={true}` to both PresenceAvatarStack instances |

