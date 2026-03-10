

## Plan: AI-Powered Digests, Smart Critical Alerts, and Operations Analytics Dashboard

Three interconnected improvements to close the current gaps.

---

### 1. AI-Powered Daily + Weekly Digest

**Current state:** `slack-daily-digest` counts conversations and lists top subjects — no actual message content is read.

**Change:** Fetch the latest messages (not just conversation metadata) and pass them to OpenAI for a natural-language summary.

**`supabase/functions/slack-daily-digest/index.ts`** — Major rewrite:
- Fetch messages from `messages` table joined on conversations for the period (last 24h for daily, last 7d for weekly)
- Select up to ~100 recent customer messages (`sender_type = 'customer'`), cleaned via `cleanPreviewText`
- Build a prompt: "Summarize these customer support conversations. Highlight recurring themes, urgent issues, sentiment trends, and notable patterns."
- Call OpenAI (`gpt-4o-mini`) to generate a structured summary with sections: Key Themes, Urgent Issues, Sentiment Overview, Notable Patterns, Recommendations
- Build Slack Block Kit with the AI summary + the existing numeric stats (open/closed/new counts)
- Add a `digest_type` parameter: `'daily'` (default) or `'weekly'`
- Weekly mode: fetch 7 days of data, use a more comprehensive prompt asking for week-over-week trends
- Support `digest_frequency` in `slack_integrations.configuration` (`daily`, `weekly`, `both`)

**New edge function: `supabase/functions/slack-weekly-digest/index.ts`**:
- Thin wrapper that calls the daily digest function with `digest_type: 'weekly'` and 7-day window
- Alternatively, keep it all in one function with a parameter — simpler

**Migration** — Add `digest_frequency` field to `slack_integrations.configuration` (no schema change needed, it's JSONB).

**UI update in `SlackIntegrationSettings.tsx`**:
- Add a "Digest Frequency" selector: Daily / Weekly / Both
- Store in `configuration.digest_frequency`

**Cron schedule**: Daily at 07:00 UTC (existing), Weekly on Monday 07:00 UTC (new cron job).

---

### 2. AI-Powered Critical Alert Triage

**Current state:** Simple keyword matching on subject + preview text. Misses nuanced messages like "I've been waiting 3 weeks and nobody has responded" or "the car was damaged during service."

**Change:** Add an AI classification step that reads the full message context.

**`supabase/functions/send-slack-notification/index.ts`** — Extend the critical triage section:
- Keep existing keyword check as a fast first pass (no API call needed for obvious keywords)
- When keywords don't match but the event is `new_conversation` or `customer_reply`: fetch the last 3-5 messages from the conversation and call OpenAI with a classification prompt:
  ```
  "Analyze this customer message in context. Is this critical/urgent?
   Categories: billing_issue, service_failure, safety_concern, frustrated_customer,
   escalation_request, legal_threat, data_issue, none.
   Return JSON: { critical: boolean, category: string, reason: string, severity: 1-5 }"
  ```
- If `critical: true` and `severity >= 3`, trigger the critical alert with the AI-provided `reason` as context
- Add rate limiting: max 1 AI triage call per conversation per 10 minutes (track in memory or a simple cache)
- Include the AI reason in the Slack critical alert block: "AI detected: frustrated customer — waiting 3 weeks with no response"

This gives context-aware detection without removing the fast keyword path.

---

### 3. Operations Analytics Dashboard

**Current state:** The `/operations/analytics` route shows a placeholder "Analytics dashboard for operations performance and metrics."

**Build a real dashboard** with data from existing tables.

**New component: `src/components/operations/OperationsAnalyticsDashboard.tsx`**:
- Period selector (7d / 30d / 90d)
- KPI cards row:
  - Total messages received (from `messages` where `sender_type = 'customer'`)
  - Total messages sent (agent replies)
  - Total conversations
  - Avg response time
  - Total calls (from `calls` table if exists, or `call_records`)
- Charts (using existing recharts):
  - Message volume by day (line chart, split by channel: email/chat/widget)
  - Conversations by status (pie/bar)
  - Response time trend (line chart)
  - Channel distribution (bar chart)
- Content insights section — AI-generated:
  - "Top themes this period" — call `generate-analytics-report` edge function enhanced with AI summary
  - Common customer questions
  - Sentiment breakdown

**New hook: `src/hooks/useOperationsAnalytics.ts`**:
- Queries `conversations` (counts by status, channel, date)
- Queries `messages` (counts by sender_type, date, channel)
- Queries `call_records` or similar for call data
- Computes trends vs previous period

**Update `src/pages/Index.tsx`** — Replace the placeholder with the new dashboard component.

**Enhance `supabase/functions/generate-analytics-report/index.ts`**:
- Add message volume metrics (total received/sent)
- Add AI summary: fetch recent messages, pass to OpenAI for theme extraction
- Return structured content insights alongside numeric data

---

### Files changed

| File | Change |
|---|---|
| `supabase/functions/slack-daily-digest/index.ts` | Add AI summarization of messages, support daily/weekly mode |
| `supabase/functions/send-slack-notification/index.ts` | Add AI context-aware critical triage alongside keyword matching |
| `supabase/functions/generate-analytics-report/index.ts` | Add message volume metrics + AI theme extraction |
| New: `src/components/operations/OperationsAnalyticsDashboard.tsx` | Full analytics dashboard with KPIs, charts, AI insights |
| New: `src/hooks/useOperationsAnalytics.ts` | Hook to fetch conversation/message/call metrics |
| `src/pages/Index.tsx` | Replace analytics placeholder with dashboard component |
| `src/components/admin/SlackIntegrationSettings.tsx` | Add digest frequency selector (daily/weekly/both) |

