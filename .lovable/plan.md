
Root cause identified (with evidence):

1) Backend is now writing typing rows successfully.
- `chat_typing_indicators` has a row for this exact conversation (`3b8c18b9-...`) and your user (`7e8f424e-...`), so `ReplyArea -> useAgentTyping -> upsert` is executing.
- FK now points to `profiles(user_id)` and table is in `supabase_realtime` publication.

2) The UI has a hard fallback that forces green (never typing) when presence viewers are empty.
- In `PresenceAvatarStack.tsx`, when `sortedViewers.length === 0` and `showSelfFallback` is true, it renders:
  - `isTyping={false}` (hardcoded)
- So if presence tracking is empty/disconnected/delayed, the avatar ring cannot turn amber even when typing rows exist.

3) Reliability gap in `useAgentTyping` makes failures silent and sticky.
- It sets `lastTypingRef.current = isTyping` before verifying DB success.
- It also uses try/catch without checking Supabase `{ error }`, so failed writes may not reset state correctly, causing suppressed retries.

This is why you can type and still never see color change.

Implementation plan for a bulletproof fix:

A) Fix the immediate UI bug (self fallback must reflect typing)
File: `src/components/conversations/PresenceAvatarStack.tsx`
- In fallback block, compute `const selfTyping = currentUserProfile ? typingUserIds.has(currentUserProfile.user_id) : false`
- Render fallback avatar with `isTyping={selfTyping}` instead of `false`.
- Result: even if presence list is empty, your own avatar ring still changes based on typing status.

B) Make typing state resilient even when realtime is delayed
Files:
- `src/hooks/useAgentTyping.ts`
- `src/hooks/useConversationTypingStatus.ts`
Plan:
1. `useAgentTyping` emits a lightweight local typing event on every state change (true/false), keyed by conversationId + userId.
2. `useConversationTypingStatus` listens to this local event and updates its `Set<string>` immediately.
3. Keep DB+realtime as source of truth for other users, but local event gives instant self feedback.
Result: ring changes immediately on keystroke, independent of websocket timing.

C) Harden `useAgentTyping` write logic (no silent failures)
File: `src/hooks/useAgentTyping.ts`
- Change upsert handling to explicitly inspect `{ error }`.
- Only commit `lastTypingRef.current` after successful write (or rollback on failure).
- If write fails, allow subsequent keystrokes to retry instead of getting stuck.
- Add guarded debug logs for failures with conversation/user context.

D) Remove policy drift that can cause unpredictable behavior/security debt
File: new migration under `supabase/migrations/*`
- Drop legacy policy that remained:
  - `"Authenticated users can manage typing indicators in their org"`
- Keep only explicit policies:
  - `typing_select_org_members`
  - `typing_insert_own`
  - `typing_update_own`
  - `typing_delete_own`
This ensures deterministic access rules and avoids policy OR-overlap confusion.

E) Optional stale-typing protection
File: `src/hooks/useConversationTypingStatus.ts`
- During initial fetch, ignore stale `is_typing=true` rows older than a short TTL (e.g. 10–15s via `updated_at`) to prevent “stuck amber” after crashes/disconnects.

Verification protocol (must pass before closing):

1) Single-tab immediate feedback
- Open conversation, start typing in ReplyArea.
- Avatar ring turns amber on first keystroke.
- Stop typing; ring returns green after ~3s.
- Send/Cancel returns to green immediately.

2) Presence disconnected scenario
- Temporarily force fallback state (or simulate no viewers).
- Confirm self avatar still turns amber while typing (via local event + fallback fix).

3) Two-tab realtime scenario
- Tab A types; Tab B sees A amber nearly immediately.
- A stops; B sees return to green after timeout.

4) DB sanity
- `chat_typing_indicators` row updates `is_typing true -> false` with fresh `updated_at`.
- No RLS or FK errors in logs.

Technical details:
```text
Before:
ReplyArea onChange
  -> useAgentTyping upsert
  -> useConversationTypingStatus waits for db/realtime
  -> PresenceAvatarStack fallback forces isTyping=false  (breaks self typing visual)

After:
ReplyArea onChange
  -> useAgentTyping:
      - emits local typing event immediately
      - upserts with explicit error handling/retry-safe state
  -> useConversationTypingStatus:
      - merges local events + realtime/db
  -> PresenceAvatarStack fallback uses computed selfTyping
      (no dependence on presence viewers to show own typing color)
```

This plan addresses the confirmed root cause and closes the failure paths that make the indicator unreliable.
