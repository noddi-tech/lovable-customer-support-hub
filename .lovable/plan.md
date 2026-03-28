

## Batch Critical Alert Review for Open Conversations

### What we'll build

A new edge function `review-open-critical` that:
1. Fetches all open/pending conversations with their latest customer message
2. Runs each through the same keyword + AI critical triage logic used by `send-slack-notification`
3. Respects the existing 24h dedup (won't re-alert conversations already alerted)
4. Posts critical alerts to the configured critical channel for any matches
5. Returns a summary of what was found and alerted

### Implementation

**New file**: `supabase/functions/review-open-critical/index.ts`

- Query `conversations` where `status in ('open', 'pending')` joined with `customers` and `inboxes`
- For each conversation, fetch latest customer message as preview text
- Load `slack_integrations` config for the org
- Run keyword matching (same `CRITICAL_KEYWORDS` list) and optionally AI triage
- Check 24h dedup via `notifications` table (`type = 'critical_alert_sent'`)
- Post critical alert to Slack for matches (same red-attachment format)
- Track each alert in `notifications` to prevent future duplicates
- Return JSON summary: `{ reviewed, alerted, skipped_dedup, details[] }`

### Invocation

After deploying, I'll invoke it once via `supabase--curl_edge_functions` to trigger the review immediately.

### Files
| # | File | Change |
|---|------|--------|
| 1 | `supabase/functions/review-open-critical/index.ts` | New edge function |

