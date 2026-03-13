
Root cause found. This is a regression introduced in `useConversationPresence` during the last “stabilization” change.

1) Why you only see yourself
- In `src/hooks/useConversationPresence.ts`, the channel setup effect now depends only on `organizationId`.
- But that effect has a guard requiring profile readiness (`isProfileReadyRef.current`).
- If `organizationId` arrives before profile fetch completes, the effect exits early and never runs again (because profile readiness is in a ref, not effect deps).
- Result: no presence channel subscription, no sync events, no remote viewers.

2) Why this feels inconsistent/hard
- `ConversationViewContent` only calls `trackConversation` when `isPresenceConnected === true`.
- That blocks the queueing path and delays/loses initial tracking during startup/reconnect windows.
- So even when channel eventually connects, conversation tracking can be late or missed.

Implementation plan (fix now, no DB migration needed)

A. Make presence channel bootstrap deterministic
- File: `src/hooks/useConversationPresence.ts`
- Change setup trigger so it reruns when user/profile becomes available (not only org):
  - Depend on stable primitives (`organizationId`, `user?.id`, `currentUserProfile?.user_id`) OR introduce a `profileReady` state.
- Remove “ref-only readiness” as the sole gate for channel creation.
- Keep one channel instance per org; cleanly unsubscribe on org/user change.

B. Remove startup race in conversation tracking
- File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx`
- Call `trackConversation(conversationId)` whenever conversation changes, regardless of `isPresenceConnected`.
- Keep cleanup `untrackConversation()` on effect cleanup.
- Let hook queue pending track until channel subscribes.

C. Ensure profile enrichment doesn’t block presence
- File: `src/hooks/useConversationPresence.ts`
- Use auth user id immediately for channel key/initial tracking.
- When profile fetch completes, update payload and re-track current conversation once (so name/avatar/email are correct).
- This prevents “no channel until profile fetched”.

D. Add explicit guardrails/logging for this exact failure mode
- Add targeted logs:
  - channel setup attempt with `org/user/profileReady`
  - subscription status transitions
  - queued track consumed after subscribe
- This makes future regressions obvious in console within seconds.

Technical details (exact failure path)

```text
Current broken path:
orgId resolves -> setup effect runs -> profile not ready -> return
(no dependency changes after profile ref update) -> no channel
ConversationView waits for isConnected=true -> never tracks
=> each agent only sees self fallback

Fixed path:
conversation opens -> trackConversation called immediately (queues if needed)
org/user/profile readiness triggers channel setup deterministically
SUBSCRIBED -> pending track consumed
presence sync updates viewersMap for both agents
=> both agents see each other (green), typing flips amber
```

Verification checklist (must pass before closing)
1. Two agents open same conversation (no typing): both avatars visible (green) on both screens.
2. Agent A types: Agent B sees A avatar amber/pulsing quickly.
3. Agent A stops typing/send/cancel: Agent B sees A return to green.
4. Refresh either tab: presence reappears automatically without reopening conversation.
5. Console shows `[Presence] Channel subscription status: SUBSCRIBED` and at least one sync/join event.
