

## Re-introduce Agent Activity Avatars as a Reusable Component

### Problem

The presence system is technically wired up but has two issues:
1. **No activity status** — The current `PresenceUser` type only tracks `conversation_id` (viewing). There's no distinction between "viewing" (green ring) and "responding/typing" (different ring color). The typing indicator system (`chat_typing_indicators` table + `useAgentTyping` hook) exists separately but isn't integrated into presence.
2. **Presence data not showing** — Likely a silent connection/tracking failure since all logging uses `logger.debug` (suppressed in production).

### Plan

**1. Create a reusable `AgentActivityAvatar` component**

New file: `src/components/conversations/AgentActivityAvatar.tsx`

- Single agent avatar with colored ring indicating activity status:
  - **Green ring** = viewing the conversation
  - **Orange/amber ring** (pulsing) = actively typing/responding
  - **Default ring** = present but on another conversation
- Props: `user: PresenceUser`, `isTyping?: boolean`, `size: 'sm' | 'md' | 'lg'`, `className?`
- Tooltip showing name, email, and status text ("Viewing" / "Responding")

**2. Update `PresenceAvatarStack` to use `AgentActivityAvatar`**

- Replace the inline Avatar rendering with `AgentActivityAvatar`
- Integrate typing status: cross-reference each viewer's `user_id` against `chat_typing_indicators` to determine if they're typing
- Add a new hook or extend presence data to include typing status per user

**3. Add typing awareness to presence**

Extend `PresenceUser` in `useConversationPresence.ts` to include an `activity` field (`'viewing' | 'responding'`). Two approaches:

- **Option A (simpler)**: In `PresenceAvatarStack`, query `chat_typing_indicators` for the conversation and cross-reference user IDs — the data already exists
- **Option B**: Add `activity` to the Supabase presence track payload, updated when `useAgentTyping` fires

Option A is simpler and reuses existing infrastructure.

**4. Fix silent failures — add `console.log` at critical points**

In `useConversationPresence.ts`:
- Channel subscription status change → `console.log`
- `channel.track()` result → `console.log`
- Presence sync state → `console.log`

**5. Ensure the component is used in all three views**

Already imported in:
- `ConversationListItem.tsx` (email/all conversations) ✓
- `ChatListItem.tsx` (chat) ✓
- `ConversationViewContent.tsx` (conversation detail) ✓

Just needs the underlying presence system to actually work (fix #4).

### Files

| File | Change |
|---|---|
| `src/components/conversations/AgentActivityAvatar.tsx` | **New** — reusable avatar with green/amber ring based on activity |
| `src/components/conversations/PresenceAvatarStack.tsx` | Use `AgentActivityAvatar`, integrate typing status from `chat_typing_indicators` |
| `src/hooks/useConversationPresence.ts` | Add `console.log` at subscription, track, and sync points for production debugging |
| `src/contexts/ConversationPresenceContext.tsx` | Expose typing-aware viewer data |

