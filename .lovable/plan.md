

## Fix Plan: Sentiment Analysis + Trigger Daily Digest

### Problem 1: Sentiment Analysis Empty

The deployed `generate-analytics-report` edge function is **still running the old code**. Production logs confirm it returns `{ knowledge_base, response_tracking, outcomes }` — no `ai_insights`, no `message_volume`, no `conversations`. Previous redeployment attempts failed silently.

**Fix:** Force-redeploy `generate-analytics-report` and verify the new code is live by checking the response includes `ai_insights` with `sentimentBreakdown`.

Additionally, the old deployed code tries to query a non-existent `knowledge_system_health` table (causing a PGRST205 error). The current codebase already removed that reference, so redeployment fixes both issues.

**No code changes needed** — the source code in the repo is correct. This is purely a deployment issue.

---

### Problem 2: Trigger Daily Digest to Slack

**Action:** Invoke the `slack-daily-digest` edge function with `{ "digest_type": "daily" }` to send today's digest to the configured Slack channel. This will:

1. Find all active Slack integrations with `digest_enabled: true`
2. Fetch today's conversations and customer messages
3. Generate an AI summary via OpenAI (themes, urgent issues, sentiment, recommendations)
4. Post a Block Kit message to the configured `digest_channel_id`

The function is already fully implemented in the codebase. It just needs to be:
- Redeployed (to ensure the latest code with AI summary is live)
- Invoked manually via curl

---

### Steps

| # | Action |
|---|---|
| 1 | Deploy both `generate-analytics-report` and `slack-daily-digest` edge functions |
| 2 | Invoke `slack-daily-digest` with `{ "digest_type": "daily" }` to send today's digest |
| 3 | Verify `generate-analytics-report` returns `ai_insights` with sentiment data |

No file changes required — all code is already correct in the repo.

