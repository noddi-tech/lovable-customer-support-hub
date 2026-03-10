

## Plan: Slack Daily Digest + Critical Issue Triage for Product Team

### Context

The tech/product team wants visibility into customer complaints without needing support hub accounts. Two features were agreed on:

1. **Daily Digest** — A scheduled summary of conversations pushed to a Slack channel (e.g. `#product`)
2. **Critical Triage** — Auto-detect critical issues (e.g. booking flow errors) and push them immediately to a separate Slack channel (e.g. `#critical-alerts`)

### What already exists

- Slack integration is fully set up: bot token, channel selection, event-based notifications (`send-slack-notification` edge function)
- `slack_integrations` table stores `default_channel_id`, `configuration` (with `enabled_events` array)
- Slack channel listing works (`slack-list-channels` edge function)
- The widget AI error traces component already detects booking-flow failures

### Changes

#### 1. Add Digest + Triage channel config to Slack settings

**`slack_integrations` table** — Add two new columns via migration:
- `digest_channel_id` (text, nullable) — channel for daily digests
- `critical_channel_id` (text, nullable) — channel for critical alerts

**`src/hooks/useSlackIntegration.ts`** — Extend `SlackIntegrationConfig` with `digest_enabled`, `digest_time` (e.g. "08:00"), and `critical_alerts_enabled`. Extend `updateConfiguration` to accept the new channel IDs.

**`src/components/admin/SlackIntegrationSettings.tsx`** — Add two new channel selector cards:
- "Daily Digest Channel" — pick a Slack channel + toggle + time selector
- "Critical Alerts Channel" — pick a Slack channel + toggle

#### 2. New edge function: `slack-daily-digest`

A Supabase edge function that:
- Queries the last 24h of conversations grouped by status, channel, and category
- Counts new, open, closed, and unresolved conversations
- Highlights top customer complaints (most messages / reopened)
- Formats a Block Kit summary and posts to `digest_channel_id`
- Designed to be called by a cron job (Supabase `pg_cron` or external scheduler)

#### 3. Critical triage detection in `send-slack-notification`

Modify the existing `send-slack-notification` edge function:
- After sending the normal notification, check if the message matches critical patterns:
  - Subject/content contains keywords: "booking", "can't book", "payment failed", "error", "not working", "broken"
  - Conversation priority is "urgent" or "high"
  - Widget AI conversations with `error_details` present
- If critical, also post to `critical_channel_id` with a distinct red-colored alert format and `@channel` mention

#### 4. Cron trigger for daily digest

New migration to set up `pg_cron`:
```sql
SELECT cron.schedule(
  'daily-digest',
  '0 8 * * 1-5',  -- 8 AM weekdays
  $$SELECT net.http_post(url, headers, body)$$
);
```

### Files changed

| File | Change |
|---|---|
| New SQL migration | Add `digest_channel_id`, `critical_channel_id` columns + pg_cron job |
| `src/hooks/useSlackIntegration.ts` | Extend types and mutation for new channel fields |
| `src/components/admin/SlackIntegrationSettings.tsx` | Add digest + critical channel config UI |
| New edge function: `slack-daily-digest` | Build and post daily summary to Slack |
| `supabase/functions/send-slack-notification/index.ts` | Add critical triage detection + cross-post to critical channel |
| `src/integrations/supabase/types.ts` | Auto-updated with new columns |

