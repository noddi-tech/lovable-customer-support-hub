

## Why Sentiment Analysis Is Empty

The `generate-analytics-report` edge function running in production is **stale** — it's returning the old response format without `ai_insights`, `message_volume`, or `conversations` fields. The logs confirm this:

```text
Response logged at 20:26:29:
{
  knowledge_base: { ... },
  response_tracking: { ... },
  outcomes: { ... }
}
// No ai_insights, no message_volume, no conversations
```

There's also a secondary error: the function tries to query a `knowledge_system_health` table that doesn't exist, which may be interrupting execution before it reaches the AI insights section.

### Fix

| Step | Action |
|---|---|
| 1 | **Redeploy** `generate-analytics-report` so the updated code (with AI insights, message volume, sentiment) goes live |
| 2 | **Remove** the `knowledge_system_health` query reference that's throwing `PGRST205` errors, or add a try/catch so it doesn't block the rest of the function |
| 3 | Verify the function returns `ai_insights.sentimentBreakdown` in the response after redeployment |

No frontend changes needed — the dashboard already renders `data.aiInsights.sentimentBreakdown` when present. The issue is purely that the deployed edge function is outdated.

