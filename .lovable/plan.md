
Root cause is backend, not ReplyArea wiring:

- `ReplyArea` now calls `handleTyping()` correctly.
- But `chat_typing_indicators.user_id` is FK to `profiles.id`, while `useAgentTyping` writes `auth.user.id` (which matches `profiles.user_id`).
- In this project, `profiles.id != profiles.user_id` for all users, so agent typing upserts fail and table stays empty.
- Also, `chat_typing_indicators` is not in `supabase_realtime` publication, so even successful writes would not stream to `useConversationTypingStatus`.

Implementation plan

1) Fix typing table identity mismatch (Supabase migration)
- Create a migration that:
  - Drops FK `chat_typing_indicators_user_id_fkey` (to `profiles.id`).
  - Recreates FK to `profiles(user_id)` (or removes FK and keeps UUID if preferred).
  - Keeps existing unique `(conversation_id, user_id)` constraint.
- Add `chat_typing_indicators` to realtime publication:
  - `ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing_indicators;`
  - wrapped safely in `DO $$ ... IF NOT EXISTS ... $$`.

2) Tighten typing RLS (same migration, small hardening)
- Replace current broad “FOR ALL” policy with explicit policies:
  - SELECT for org members (existing behavior).
  - INSERT/UPDATE/DELETE requiring org membership and `user_id = auth.uid()` for authenticated agent writes.
- Keep visitor typing updates via edge functions/service role unaffected.

3) Make hook user-id source deterministic
- Update `src/hooks/useAgentTyping.ts` to use `useAuth().user?.id` as primary source (instead of async one-time `supabase.auth.getUser()`), with fallback only if needed.
- This avoids missed early keystrokes before async user fetch completes.

4) Verification steps after implementation
- DB check: `chat_typing_indicators` should receive rows while typing.
- UI check: avatar ring changes green → amber/pulsing within ~1s on typing; returns to green after 3s idle / Send / Cancel.
- Realtime check with two tabs/users to confirm remote visibility.
