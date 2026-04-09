# Slack Alerting System — Architecture & Reuse Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Slack Channels                          │
│  #support-notifications  │  #critical-alerts  │  #daily-digest │
└──────────┬───────────────┴────────┬───────────┴───────┬────────┘
           │                        │                   │
┌──────────▼──────────┐  ┌──────────▼──────────┐  ┌─────▼────────────┐
│ send-slack-          │  │ review-open-         │  │ slack-daily-      │
│ notification         │  │ critical             │  │ digest            │
│                      │  │                      │  │                   │
│ • Real-time events   │  │ • Batch audit scan   │  │ • AI summaries    │
│ • Keyword + AI       │  │ • Catches missed     │  │ • Daily / weekly  │
│   critical triage    │  │   critical alerts    │  │ • GPT-4o-mini     │
│ • Color-coded blocks │  │ • 24h dedup          │  │ • Time-gated      │
└──────────▲──────────┘  └─────────────────────┘  └──────────────────┘
           │
┌──────────┴──────────┐  ┌────────────────────────┐
│ sla-breach-          │  │ process-mention-        │
│ notifier             │  │ notifications           │
│                      │  │                         │
│ • Delegates to       │  │ • @mention DMs          │
│   send-slack-notif   │  │ • Email notifications   │
│ • Warning + breach   │  │ • Audio alerts          │
└─────────────────────┘  └─────────────────────────┘
```

### Function Roles

| Function | Trigger | Purpose |
|---|---|---|
| `send-slack-notification` | Called by other functions / app events | Central dispatcher — formats and posts to Slack, runs critical triage |
| `review-open-critical` | pg_cron (hourly) or manual | Batch scans open conversations for missed critical keywords |
| `slack-daily-digest` | pg_cron (hourly, time-gated) | AI-powered daily/weekly conversation summaries |
| `sla-breach-notifier` | pg_cron (every 15 min) | Checks for upcoming/breached SLAs, delegates Slack posting |
| `process-mention-notifications` | Called when @mention detected | Sends DMs + emails for @mentions |

---

## Shared Patterns

### 1. Token Selection

Two tokens exist per org for posting to different Slack workspaces:

```typescript
// Primary token — customer support workspace
const token = integration.access_token;

// Secondary token — product/engineering workspace (critical alerts, digests)
const criticalToken = integration.secondary_access_token || integration.access_token;
```

**Rule:** Use `secondary_access_token` for critical alerts and digests (product team). Fall back to `access_token` if not configured.

### 2. CORS Headers

All edge functions use this pattern:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

### 3. HTML-to-Text Cleaning

Customer messages often contain HTML. Strip it before posting to Slack:

```typescript
function cleanPreviewText(text: string | undefined, maxLength: number = 180): string {
  if (!text) return '';
  let result = text;
  // Remove non-visible elements
  result = result.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  // Convert block elements to newlines, then strip all tags
  result = result.replace(/<\/?(p|div|br|tr|li|td|th|h[1-6])[^>]*>/gi, '\n');
  result = result.replace(/<[^>]+>/g, ' ');
  // Decode HTML entities
  result = result.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/&[a-z]+;/gi, ' ');
  // Normalize whitespace
  result = result.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (result.length > maxLength) result = result.substring(0, maxLength).trim() + '...';
  return result;
}
```

**Important:** After cleaning, escape for Slack mrkdwn:
```typescript
cleanedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
```

### 4. Block Kit Message Building

Standard notification (blue):
```typescript
const blocks = [
  {
    type: 'section',
    text: { type: 'mrkdwn', text: `📩 *New message* — ${subject}` },
  },
  {
    type: 'section',
    fields: [
      { type: 'mrkdwn', text: `*From:*\n${customerName}` },
      { type: 'mrkdwn', text: `*Subject:*\n${subject}` },
    ],
  },
  {
    type: 'actions',
    elements: [{
      type: 'button',
      text: { type: 'plain_text', text: '👀 View Conversation', emoji: true },
      url: conversationUrl,
    }],
  },
];

// Post with color-coded attachment
await fetch('https://slack.com/api/chat.postMessage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    channel: channelId,
    text: fallbackText,           // Plain text fallback
    attachments: [{
      color: '#3b82f6',           // Blue for standard
      blocks,
    }],
    unfurl_links: false,
    unfurl_media: false,
  }),
});
```

Critical alert (red):
```typescript
attachments: [{
  color: '#dc2626',               // Red for critical
  blocks: criticalBlocks,
}]
```

### 5. 24-Hour Deduplication

Prevents the same conversation from triggering duplicate alerts within 24 hours:

```typescript
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const { data: existingAlerts } = await supabase
  .from('notifications')
  .select('data')
  .eq('type', 'critical_alert_sent')
  .gte('created_at', twentyFourHoursAgo);

const alertedConvIds = new Set<string>();
if (existingAlerts) {
  for (const alert of existingAlerts) {
    const convId = (alert.data as any)?.conversation_id;
    if (convId) alertedConvIds.add(convId);
  }
}

// Skip if already alerted
if (alertedConvIds.has(conversationId)) {
  console.log('⏭️ Already alerted, skipping');
  return;
}

// After sending alert, record it
await supabase.from('notifications').insert({
  user_id: '00000000-0000-0000-0000-000000000000',  // System user
  title: 'Critical alert sent',
  message: `Critical alert for conversation ${conversationId}`,
  type: 'critical_alert_sent',
  data: {
    conversation_id: conversationId,
    trigger: `keyword: ${matchedKeyword}`,
    source: 'realtime',  // or 'batch_review'
  },
});
```

### 6. Time-Gated Scheduling

For per-org scheduling with a single cron trigger:

```typescript
// pg_cron fires hourly → function checks each org's preferred time
const nowOslo = new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' });
const currentHour = new Date(nowOslo).getHours();
const currentMinute = new Date(nowOslo).getMinutes();

const digestHour = parseInt(config.digest_time?.split(':')[0] || '8');
const digestMinute = parseInt(config.digest_time?.split(':')[1] || '0');

// Only proceed if we're within the matching hour window
if (currentHour !== digestHour) continue;
if (Math.abs(currentMinute - digestMinute) > 30) continue;

// Support force-trigger for testing
const body = await req.json().catch(() => ({}));
if (body.force) { /* skip time check */ }
```

### 7. AI Critical Triage

GPT-4o-mini classifies message severity (used in `send-slack-notification`):

```typescript
const triageResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${openaiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    temperature: 0.1,
    messages: [{
      role: 'system',
      content: `Classify this customer message. Return JSON:
        { "is_critical": boolean, "severity": 1-5, "category": "..." }
        Critical = booking failures, payment errors, service outages, safety issues.`
    }, {
      role: 'user',
      content: `Subject: ${subject}\nMessage: ${messageText}`
    }],
  }),
});
```

### 8. Critical Keyword List (Bilingual EN/NO)

Shared between `send-slack-notification` and `review-open-critical`:

```typescript
const CRITICAL_KEYWORDS = [
  // English
  'booking', "can't book", 'cannot book', 'payment failed', 'payment error',
  'error', 'not working', 'broken', 'down', 'outage', "can't access",
  'unable to', 'fails', 'failure', 'critical', 'urgent',
  // Norwegian
  'kan ikke bestille', 'bestilling feilet', 'betaling feilet',
  'betalingsfeil', 'fungerer ikke', 'virker ikke', 'funker ikke',
  'feil', 'feilmelding', 'feiler', 'nedetid', 'ødelagt', 'nede',
  'får ikke til', 'klarer ikke', 'ikke tilgjengelig',
  'kritisk', 'haster', 'akutt',
  'kan ikke logge inn', 'innlogging feiler',
  'appen krasjer', 'krasjer', 'tom side', 'blank side',
];

const textToCheck = [subject, previewText, customerName]
  .filter(Boolean).join(' ').toLowerCase();
const matchedKeyword = CRITICAL_KEYWORDS.find(kw => textToCheck.includes(kw));
```

---

## Database Dependencies

### `slack_integrations`

| Column | Purpose |
|---|---|
| `organization_id` | Links to org |
| `access_token` | Primary bot token (support workspace) |
| `secondary_access_token` | Optional second workspace token (product team) |
| `default_channel_id` | Standard notifications |
| `digest_channel_id` | Daily/weekly digest destination |
| `critical_channel_id` | Critical alert destination |
| `is_active` | Master on/off |
| `configuration` (JSONB) | See Configuration Reference below |

### `notifications`

Used for deduplication tracking:

| Field | Value |
|---|---|
| `type` | `'critical_alert_sent'`, `'sla_warning'`, `'sla_breach'` |
| `data->conversation_id` | Conversation being alerted |
| `data->source` | `'realtime'`, `'batch_review'` |
| `created_at` | Used for 24h window check |

---

## How to Add a New Alert Type

### Step-by-step

1. **Add event type** to the request type in `send-slack-notification`:
   ```typescript
   event_type: 'new_message' | 'assignment' | 'sla_warning' | 'your_new_event';
   ```

2. **Add to enabled_events check** (so orgs can toggle it):
   ```typescript
   const enabledEvents = config.enabled_events || ['new_message', 'assignment'];
   if (!enabledEvents.includes(event_type)) return;
   ```

3. **Build Block Kit blocks:**
   ```typescript
   if (event_type === 'your_new_event') {
     blocks = [
       {
         type: 'section',
         text: { type: 'mrkdwn', text: `🔔 *Your Alert Title* — ${subject}` },
       },
       {
         type: 'section',
         fields: [
           { type: 'mrkdwn', text: `*From:*\n${customerName}` },
           { type: 'mrkdwn', text: `*Detail:*\n${detail}` },
         ],
       },
       {
         type: 'actions',
         elements: [{
           type: 'button',
           text: { type: 'plain_text', text: '👀 View', emoji: true },
           url: conversationUrl,
         }],
       },
     ];
   }
   ```

4. **Add deduplication** (if needed):
   ```typescript
   // Check notifications table for existing alert in last N hours
   const { data: existing } = await supabase
     .from('notifications')
     .select('id')
     .eq('type', 'your_new_event_sent')
     .contains('data', { conversation_id: convId })
     .gte('created_at', cutoffTime)
     .maybeSingle();
   if (existing) return;
   ```

5. **Choose token and channel:**
   ```typescript
   const token = integration.secondary_access_token || integration.access_token;
   const channel = integration.critical_channel_id || integration.default_channel_id;
   ```

6. **Post via `chat.postMessage`** (see Block Kit section above).

---

## Configuration Reference

The `configuration` JSONB column on `slack_integrations`:

| Field | Type | Default | Purpose |
|---|---|---|---|
| `enabled_events` | `string[]` | `['new_message', 'assignment']` | Which events trigger standard notifications |
| `critical_alerts_enabled` | `boolean` | `true` | Master toggle for critical alerting |
| `digest_frequency` | `string` | `'daily'` | `'daily'`, `'weekly'`, or `'both'` |
| `digest_time` | `string` | `'08:00'` | Time to send digest (Europe/Oslo) |
| `digest_day` | `string` | `'monday'` | Day for weekly digest |
| `email_on_mention` | `boolean` | `true` | Send email when @mentioned |

### Channel Routing

| Alert Type | Channel Column | Token |
|---|---|---|
| Standard notifications | `default_channel_id` | `access_token` |
| Critical alerts | `critical_channel_id` | `secondary_access_token` ∥ `access_token` |
| Daily/weekly digests | `digest_channel_id` | `secondary_access_token` ∥ `access_token` |
| @mention DMs | Resolved via `conversations.open` | `access_token` |

---

## Testing & Manual Triggers

### Force-trigger a digest

```bash
curl -X POST \
  'https://<project-ref>.supabase.co/functions/v1/slack-daily-digest' \
  -H 'Authorization: Bearer <service-role-key>' \
  -H 'Content-Type: application/json' \
  -d '{ "force": true, "digest_type": "daily" }'
```

### Run batch critical review

```bash
curl -X POST \
  'https://<project-ref>.supabase.co/functions/v1/review-open-critical' \
  -H 'Authorization: Bearer <service-role-key>' \
  -H 'Content-Type: application/json'
```

### Test a real-time notification

```bash
curl -X POST \
  'https://<project-ref>.supabase.co/functions/v1/send-slack-notification' \
  -H 'Authorization: Bearer <service-role-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "organization_id": "<org-id>",
    "event_type": "new_message",
    "conversation_id": "<conv-id>",
    "customer_name": "Test User",
    "customer_email": "test@example.com",
    "subject": "Test notification",
    "inbox_name": "Support"
  }'
```
