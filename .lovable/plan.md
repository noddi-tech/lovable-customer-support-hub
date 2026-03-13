

## Root Cause: Two Separate Failures

### Problem 1: Cross-user avatar visibility
The Supabase Presence (WebSocket) channel is the sole source for "who is viewing this conversation." When presence sync fails (which it clearly is — the console shows NO `[Presence] Sync event` logs), each user only sees their own avatar via the `showSelfFallback` path. There is no fallback mechanism to discover other agents.

### Problem 2: Cross-user typing indicator
The typing status IS stored correctly in the database (both users have rows in `chat_typing_indicators`). The `useConversationTypingStatus` hook subscribes via `postgres_changes` and builds a `Set<string>` of typing user IDs. **However**, the `PresenceAvatarStack` only applies `isTyping` to avatars that are already rendered from the presence viewers list. If user B isn't in the viewers list (because presence failed), there is no avatar to turn amber — even though the typing data exists.

```text
Current flow (broken):
  Presence WebSocket → viewersMap → render avatars → apply typing color
                         ↑ FAILS                       ↑ no avatar = no color

Proposed flow (bulletproof):
  Typing DB + Realtime → fetch profiles of typing users → merge with presence viewers
  Presence WebSocket → viewersMap (bonus, not required)
  Merged list → render avatars → apply typing color from Set
```

### Fix: Make avatar rendering independent of Presence reliability

**A) New hook: `useTypingUsersWithProfiles(conversationId)`**
- File: `src/hooks/useTypingUsersWithProfiles.ts`
- Wraps `useConversationTypingStatus` to get typing user IDs
- Fetches/caches profile data (full_name, avatar_url, email) from the `profiles` table for typing users
- Returns `PresenceUser[]` of currently typing users with full profile data
- Profile cache persists across re-renders so we don't re-fetch repeatedly

**B) Update `PresenceAvatarStack` to merge typing users into viewers**
- File: `src/components/conversations/PresenceAvatarStack.tsx`
- After getting `allViewers` from presence, get `typingUsers` from the new hook
- Merge: add any typing users not already in the viewers list
- This ensures a typing agent's avatar is ALWAYS rendered, even if presence is down
- The `isTyping` flag is already computed from `typingUserIds.has(viewer.user_id)`

**C) Stabilize presence channel (prevent unnecessary reconnections)**
- File: `src/hooks/useConversationPresence.ts`
- Remove `currentUserProfile` from the channel setup `useEffect` dependencies
- Use `currentUserProfileRef` inside the effect instead (already exists)
- This prevents the channel from being torn down and recreated when profile state is set, which causes a window where the channel is disconnected and misses sync events

### Result
- **Same-user typing**: Avatar turns amber immediately (local event bus, already works)
- **Cross-user typing**: Avatar appears AND turns amber via DB-backed typing + profile fetch (no dependency on Presence WebSocket)
- **Cross-user viewing**: Still works via Presence when available, but system degrades gracefully when it doesn't
- **Self-fallback**: Still works as before when nobody else is viewing/typing

