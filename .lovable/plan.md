

## Plan: Force redeploy `send-test-critical-alert` + `backfill-critical-alert-ts`

### Root cause

The toast still says "Edge Function returned a non-2xx status code" because **`send-test-critical-alert` has zero edge function logs** — it was never successfully deployed despite the source file being created and registered in `config.toml`. Supabase's edge gateway returns a generic 404/non-2xx when the function isn't live, which `supabase.functions.invoke` reports as "non-2xx status code" (no body to parse). The structured `{ ok, error }` response we built can't help because the function code never runs.

The 👍 reaction working is unrelated — that path goes:
- Slack → `slack-event-handler` (separate function, fully deployed) → `critical_alert_feedback` table.

We just verified one row exists in `critical_alert_feedback` with `reaction='+1'` from your test 👍, so the feedback loop itself is healthy. ✅

### Fix

1. **Force a fresh deploy** of both new functions via `supabase--deploy_edge_functions(["send-test-critical-alert", "backfill-critical-alert-ts"])`. Auto-deploy from the `lov-write` step appears to have silently dropped these two new functions.
2. **Smoke-test immediately** via `supabase--curl_edge_functions` against `/send-test-critical-alert` (POST `{}`) to confirm:
   - HTTP 200 returned
   - Body is `{ ok: true, sent: true, ... }` OR `{ ok: false, error, error_stage }` (so the structured-error handling we built actually works)
3. **Tail logs** with `supabase--edge_function_logs` to confirm boot + execution is recorded.
4. If step 2 returns `{ ok: false, error_stage: ... }`, fix the underlying gap (likely `no_conversation` or a Slack routing detail) — the toast on the next click will then show the precise reason instead of the generic gateway error.

### No code changes needed unless step 2 reveals a real failure stage

The function code from the previous turn is correct (always-200 + structured errors). We just need it actually running.

### Verification

1. Click **Send testvarsel** in `/admin/integrations` → Triage Health card.
2. Expected: toast either says "Testvarsel sendt — sjekk Slack…" (success) or shows a precise stage like `[no_inbox]`, `[slack_invoke: ...]`.
3. If success: react 👍 / 🔇 on the new Slack message → confirm new row in `critical_alert_feedback` (and `critical_keyword_mutes` for 🔇 with keyword `test-trigger-please-ignore`).

### Files touched

None expected. Pure deploy + smoke test. Only modify code if step 2 surfaces a configuration gap.

