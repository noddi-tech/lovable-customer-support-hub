

## Plan: Backfill Slack timestamps + add manual test trigger

Two small additions so you can verify the feedback loop without waiting for a real critical alert.

### 1. Backfill `slack_message_ts` for recent alerts (best-effort)

For the last ~50 `critical_alert_sent` notifications missing `slack_message_ts`, call Slack `conversations.history` on the resolved channel and match by:
- approximate timestamp (notification `created_at` ± 10s)
- bot user ID (the message author must be our bot)
- text contains `CRITICAL` (sanity check)

When matched, `UPDATE notifications SET data = data || jsonb_build_object('slack_message_ts', ts, 'slack_channel_id', channel) WHERE id = ...`.

Implemented as a one-off edge function `backfill-critical-alert-ts` invoked manually. Safe to re-run (skips rows that already have ts).

Caveats:
- Only works for alerts within Slack's history window and where the channel is still resolvable from the integration.
- Won't recover alerts where the bot message was deleted or the channel was archived.
- The "Booking av dekkskift" message in your screenshot is from `C02KWUX0Q03` ts=`1776677349.611669` — it'll be one of the candidates.

### 2. "Send test critical alert" button (admin UI)

Add a button on the Triage Health card → calls a new edge function `send-test-critical-alert` that:
- Fires a real Slack alert via `send-slack-notification` to the configured Tech channel
- Uses keyword `"test-trigger-please-ignore"` so it's distinct from real alerts
- Subject/body marked clearly as a test
- Writes a normal `critical_alert_sent` notification (so the reaction loop is reachable)

This gives you a deterministic way to verify 👍/👎/🔇 → `critical_alert_feedback` / `critical_keyword_mutes` without waiting for a customer issue.

### 3. Implementation map

- New `supabase/functions/backfill-critical-alert-ts/index.ts` — admin-only, JWT-verified, scans last 50 notifications.
- New `supabase/functions/send-test-critical-alert/index.ts` — admin-only, fires one alert.
- `src/components/admin/TriageHealthDashboard.tsx` — add two small buttons in the header: "Send testvarsel" and "Backfill gamle varsler".
- Empty-state alert (the one in your screenshot) updated to mention: *"Eldre varsler kan ikke reageres på fordi vi ikke lagret Slack-ID-en. Bruk 'Send testvarsel' for å verifisere flyten."*

### 4. Verification

1. Click **Send testvarsel** → real alert appears in Tech channel (or fallback channel).
2. React 👍 on it → row appears in `critical_alert_feedback` with `reaction='+1'`.
3. React 🔇 → row appears in `critical_keyword_mutes` with `keyword='test-trigger-please-ignore'`, `expires_at=+7d`.
4. Triage Health KPIs update on next refresh.
5. Click **Backfill gamle varsler** → recent alerts gain `slack_message_ts` in `notifications.data`. Try reacting to the "Booking av dekkskift" message — should now record feedback.

