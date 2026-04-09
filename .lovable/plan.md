

# Create Slack Alerting System README

## What this does

Creates a new `docs/SLACK_ALERTING_SYSTEM.md` file that documents the complete Slack notification architecture — all five edge functions, their patterns, shared concepts (deduplication, token selection, Block Kit formatting, critical triage), and how to reuse these patterns for new alert types.

## File to create

### `docs/SLACK_ALERTING_SYSTEM.md`

A single reference document covering:

**1. Architecture Overview**
- Diagram of the 5 Slack-related edge functions and how they connect:
  - `send-slack-notification` — real-time event notifications + critical triage (keyword + AI)
  - `slack-daily-digest` — scheduled daily/weekly AI-powered summaries
  - `review-open-critical` — batch audit scan for missed critical alerts
  - `sla-breach-notifier` — SLA warning/breach notifications (delegates to `send-slack-notification`)
  - `process-mention-notifications` — @mention DMs + channel posts

**2. Shared Patterns (the reusable parts)**
- **Token selection**: primary `access_token` vs `secondary_access_token` (product workspace), when to use which
- **CORS headers**: standard pattern used across all functions
- **HTML-to-text cleaning**: `cleanPreviewText()` / `stripHtml()` utility for safe Slack rendering
- **Block Kit message building**: attachment color coding (blue `#3b82f6` for standard, red `#dc2626` for critical), section/fields/context/actions structure
- **24-hour deduplication**: using `notifications` table with `type` + `data->conversation_id` + `created_at` range check
- **Time-gated scheduling**: pg_cron hourly trigger → per-org `digest_time` comparison in Europe/Oslo timezone
- **AI triage**: GPT-4o-mini integration for context-aware critical detection (categories, severity 1-5)
- **Critical keyword list**: bilingual EN/NO keyword array, shared between `send-slack-notification` and `review-open-critical`

**3. Database Dependencies**
- `slack_integrations` table schema (key columns: `access_token`, `secondary_access_token`, `default_channel_id`, `digest_channel_id`, `critical_channel_id`, `configuration` JSONB)
- `notifications` table (used for dedup tracking with `type: 'critical_alert_sent'`)
- `conversations`, `messages`, `customers` tables (data sources)

**4. How to Add a New Alert Type**
Step-by-step guide:
1. Add event type to `SlackNotificationRequest.event_type` union
2. Add to `enabled_events` config check
3. Build Block Kit blocks (with template)
4. Handle deduplication if needed
5. Choose token (primary vs secondary)
6. Post via `chat.postMessage`

Includes a minimal code template showing the pattern.

**5. Configuration Reference**
- `SlackIntegrationConfig` fields and what each controls
- Channel routing: which channel ID is used for which alert type
- Event type → behavior mapping table

**6. Testing & Manual Triggers**
- How to force-trigger digest (`{ "force": true, "digest_type": "daily" }`)
- How to invoke `review-open-critical` for batch review
- How to test `send-slack-notification` with a sample payload

This will be ~300-400 lines of focused, reusable documentation.

