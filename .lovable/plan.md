

## Plan: Fix "non-2xx status code" on Send testvarsel — surface real error + verify routing

The frontend is showing the generic Supabase invoke error because `send-test-critical-alert` returns HTTP 500/4xx with the actual reason hidden in the response body (which `supabase.functions.invoke` swallows). I'll fix that and harden the test-trigger flow.

### 1. Always return HTTP 200 with structured `{ ok, error, stage }`

Refactor `supabase/functions/send-test-critical-alert/index.ts` to:

- Use a `respond(ok, payload)` helper that always returns `status: 200` so the client can read the body.
- Tag every failure with an `error_stage` (`auth`, `authz`, `no_inbox`, `no_conversation`, `slack_invoke`, `slack_response`, `unexpected`).
- Capture `console.error` with full context so the next failure shows up in edge function logs (currently only "booted" is logged).
- Inspect the `send-slack-notification` response (`{ data, error }`) AND look for `data.success === false` / `data.error` (Slack invoke can resolve with a body-level error and still be HTTP 200).

### 2. Update the client to read the structured error

In `src/components/admin/TriageHealthDashboard.tsx` (`handleSendTest`):

- Treat `res.ok === false` as the failure signal (instead of relying on `error` from invoke).
- Show `res.error` and `res.error_stage` in the toast so we see the real cause (e.g. "no_inbox", "slack_invoke: missing channel mapping").

### 3. Likely root causes the new logs/toast will pinpoint

Based on the function code, the test alert will fail at one of these stages — the new error surfacing will tell us which:

- **`no_conversation`** — the chosen inbox has zero conversations. Mitigation: fall back to any conversation in the org regardless of inbox.
- **`slack_invoke`** — `send-slack-notification` rejects because no Slack integration / channel routing is configured for the org, or because `event_type: 'new_conversation'` requires a real conversation that doesn't trip the keyword filter.
- **`auth/authz`** — caller isn't admin in the chosen org (super-admin path missing).

I'll add small fallbacks for the first two:

- Pick any conversation in the org (drop the `inbox_id` filter) if the inbox-scoped lookup is empty.
- Allow `super_admin` callers (not just `admin`) to pass authz.
- Pass an explicit `force_critical: true` flag to `send-slack-notification` so the test bypasses keyword detection if we ever change the sentinel.

### 4. Files touched

- `supabase/functions/send-test-critical-alert/index.ts` — structured responses, logging, fallbacks, super-admin authz.
- `src/components/admin/TriageHealthDashboard.tsx` — read `res.ok`/`res.error`/`res.error_stage`, show in toast.
- Deploy `send-test-critical-alert` after the change.

### 5. Verification

1. Click **Send testvarsel** again.
2. If it still fails, the toast now shows a precise reason like `no_conversation` or `slack_invoke: <slack reason>`. Share the toast text and I'll fix the underlying config gap.
3. On success: alert appears in the routed Slack channel, react 👍/🔇, confirm rows in `critical_alert_feedback` / `critical_keyword_mutes`.

