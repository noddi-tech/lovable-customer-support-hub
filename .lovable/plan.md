

## Plan: Triage data quality + categorized alert headers

Two coupled improvements:
**A.** Feedback-driven keyword/category tuning (close the learning loop).
**B.** Categorized alert headers ("⚙️ Service Failure — *{title}*") so the bucket is readable at a glance.

---

## Part A — Triage data quality loop

### A1. Capture richer data on every alert (foundation)

Today `notifications.data` for `critical_alert_sent` only has `{conversation_id, trigger}`. Expand to:
```json
{
  "conversation_id": "...",
  "organization_id": "...",
  "trigger_source": "keyword" | "ai" | "batch_keyword",
  "matched_keyword": "feil" | null,
  "ai_category": "service_failure" | null,
  "ai_severity": 4 | null,
  "ai_reason": "Customer reports payment failed twice",
  "resolved_bucket": "tech" | "ops",
  "slack_channel_id": "C123",
  "slack_message_ts": "1713617422.001"   // for reaction lookups + linking back
}
```
Backfill is unnecessary — past 60 days of data is enough for the seeded analytics dashboard; new data is structured.

### A2. Inline feedback via Slack reactions (zero-friction)

Add a small footer to every critical alert:
> _React 👍 if useful, 👎 if false alarm, 🔇 to mute this trigger for 7 days._

Implement a new edge function `slack-event-handler` (Slack Events API endpoint, signed-secret verified) that listens for `reaction_added` on bot messages and writes to a new table:

```sql
critical_alert_feedback (
  id uuid pk,
  notification_id uuid references notifications,
  conversation_id uuid,
  organization_id uuid,
  trigger_source text,           -- 'keyword'|'ai'|'batch_keyword'
  matched_keyword text,          -- nullable
  ai_category text,              -- nullable
  resolved_bucket text,          -- 'tech'|'ops'
  reaction text,                 -- '+1' | '-1' | 'mute'
  reactor_slack_id text,
  reactor_email text,            -- resolved via users.info, nullable
  created_at timestamptz default now(),
  unique (notification_id, reactor_slack_id, reaction)
);
```

`🔇` reaction also writes a row to a new `critical_keyword_mutes` table with `expires_at = now() + 7 days` (keyword-scoped) — the next alert with that exact `matched_keyword` is suppressed and logged but not sent.

### A3. Lightweight admin "Triage Health" dashboard

New tab in `/admin/integrations` → Slack settings → "Triage Health":

```
┌─ Last 30 days ────────────────────────────────────────────┐
│  142 alerts sent   ·   58% 👍   ·   24% 👎   ·   18% 🔕   │
│                                                            │
│  Worst-performing triggers (👎 rate ≥ 40%):                │
│    keyword "feil"          12 alerts · 75% 👎  [Demote]   │
│    keyword "booking"       6 alerts  · 67% 👎  [Demote]   │
│    AI billing_issue (low sev) 8 · 50% 👎       [Tune]     │
│                                                            │
│  Best (👍 rate ≥ 80%):                                     │
│    AI safety_concern       11 alerts · 91% 👍             │
│    keyword "appen krasjer"  4 · 100% 👍                    │
│                                                            │
│  Currently muted (auto-expires):                           │
│    "feil" — expires in 4d  [Unmute]                       │
└────────────────────────────────────────────────────────────┘
```

"Demote" → moves the keyword from the active list into a per-org `critical_keyword_overrides.disabled_keywords` JSONB array (so we don't ship code edits for tuning).
"Tune" on AI category → opens a small dialog: "Require severity ≥ N for this category" → stored in `slack_integrations.critical_ai_severity_thresholds` (jsonb, e.g. `{"billing_issue": 4}`).

### A4. Org-scoped keyword overrides (no more shipping code for tuning)

Add to `slack_integrations`:
```
critical_keyword_overrides   jsonb default '{}'  
  -- { "disabled": ["feil","booking"], "added": ["pin-kode","pin code","kode kommer ikke"] }
critical_ai_severity_thresholds  jsonb default '{}'
  -- { "billing_issue": 3, "frustrated_customer": 4 }   (default = 3 if absent)
```

In `send-slack-notification` and `review-open-critical`:
- Effective keyword list = `BASE_CRITICAL_KEYWORDS` ∪ `overrides.added` − `overrides.disabled` − active `critical_keyword_mutes`.
- AI alert threshold per category = `thresholds[category] ?? 3`.

Admin UI already-built `CriticalAlertRouting.tsx` gets a fourth card "Keyword tuning" (add/remove + view base list + view active mutes).

### A5. AI Pattern Suggestions (the "gets better and better" piece)

Weekly cron (`triage-pattern-mining`, runs Sundays via `pg_cron`) that:
1. Pulls last 60 days of conversations + their critical-alert status.
2. Asks Lovable AI Gateway (`google/gemini-3-flash-preview`) to find:
   - **Missed criticals**: conversations with no alert that look urgent (high frustration, reply-time SLA breach, manual escalation, customer churn signals).
   - **False-positive patterns**: alerts with ≥2 👎 reactions sharing common subject/body terms.
3. Writes proposals to a new `triage_pattern_proposals` table:
   ```
   { type: 'add_keyword' | 'remove_keyword' | 'raise_threshold',
     value: 'pin-kode',  reason: 'Found in 7 conversations marked urgent by agent but no alert sent',
     evidence_conversation_ids: [...],  status: 'pending' }
   ```
4. Surfaced in the Triage Health dashboard as "📈 5 suggested improvements" with one-click Accept/Reject (Accept = writes to `critical_keyword_overrides`).

This is the flywheel: more alerts → more reactions → better proposals → better alerts.

---

## Part B — Categorized alert message headers

### B1. New header format

Replace today's `🚨 *CRITICAL ALERT* — {title}` with category-prefixed, scannable headers:

| Category | Norwegian label | Emoji | Example header |
|---|---|---|---|
| `service_failure` | Tjenestefeil | ⚙️ | `⚙️ *Tjenestefeil* — Appen krasjer ved booking` |
| `data_issue` | Datafeil | 📊 | `📊 *Datafeil* — Feil pris vises i kurv` |
| `billing_issue` | Betalingsproblem | 💳 | `💳 *Betalingsproblem* — Belastet to ganger` |
| `safety_concern` | Sikkerhetsproblem | ⚠️ | `⚠️ *Sikkerhetsproblem* — Skadet bil etter dekkskift` |
| `frustrated_customer` | Frustrert kunde | 😤 | `😤 *Frustrert kunde* — Verste opplevelse noensinne` |
| `escalation_request` | Eskalering | 🆙 | `🆙 *Eskalering* — Vil snakke med leder` |
| `legal_threat` | Rettslig trussel | ⚖️ | `⚖️ *Rettslig trussel* — Kontakter advokat` |
| (fallback unknown) | Kritisk varsel | 🚨 | `🚨 *Kritisk varsel* — {title}` |

Severity (when present) goes on a second line as a small badge: `🔥 Severity 5/5` for ≥4, `🟠 Severity 3/5` for 3.

### B2. Slack `text` fallback (push notifications)

The mobile push currently shows `🚨 CRITICAL: …`. Change to category-prefixed too:
```
⚙️ Tjenestefeil — Appen krasjer (Ola Nordmann) <!subteam^...>
```
This is what shows in mobile lock-screens — making the category visible there is the highest-leverage UX change.

### B3. Color hint per category

Today every critical alert is the same red `#dc2626`. Switch to category-tinted attachment colors (still all "warning-grade", just distinguishable on a glance through the channel scrollback):

- Tech bucket (`service_failure`, `data_issue`): `#dc2626` (red — outage feel)
- `billing_issue`: `#f59e0b` (amber — money)
- `safety_concern`: `#7c2d12` (dark red — gravity)
- `legal_threat`: `#581c87` (purple — formal)
- `frustrated_customer`, `escalation_request`: `#ea580c` (orange — heat)

### B4. Centralize header building in `_shared/critical-routing.ts`

Add `buildAlertHeader(category, title): { text, emoji, label, color }` so `send-slack-notification` and `review-open-critical` produce identical formatting. No drift between live alerts and batch-review alerts.

### B5. Footer with feedback prompt

Append to every alert:
```
context: 👍 useful · 👎 false alarm · 🔇 mute this trigger 7d
```
Wired to A2's reaction handler.

---

## Files

**New**
- migration: `critical_alert_feedback`, `critical_keyword_mutes`, `triage_pattern_proposals`; add `critical_keyword_overrides` + `critical_ai_severity_thresholds` to `slack_integrations`.
- `supabase/functions/slack-event-handler/index.ts` (signed Slack Events endpoint for reactions)
- `supabase/functions/triage-pattern-mining/index.ts` (weekly cron)
- `supabase/functions/_shared/critical-routing.ts` — add `buildAlertHeader`, `getEffectiveKeywords`, `getCategoryThreshold`, `CATEGORY_PRESENTATION` map.
- `src/components/admin/TriageHealthDashboard.tsx` (the dashboard in A3)
- `src/components/admin/KeywordTuningCard.tsx` (4th card in `CriticalAlertRouting.tsx`)
- `src/hooks/useTriageHealth.ts`, `useKeywordOverrides.ts`, `usePatternProposals.ts`

**Modified**
- `send-slack-notification/index.ts`: use `buildAlertHeader`, write expanded `notifications.data`, store Slack `message_ts`, append feedback footer, honor overrides + thresholds + mutes.
- `review-open-critical/index.ts`: same expanded data + header logic.
- `CriticalAlertRouting.tsx`: add "Keyword tuning" card, link to Triage Health dashboard.
- `supabase/config.toml`: register the two new edge functions.

## Slack app config

`slack-event-handler` requires the Slack app to have `reactions:read` scope and the Events API URL pointed at the function. The plan includes a setup checklist in the Triage Health UI ("Enable feedback collection: 1. Add scope, 2. Set Events URL, 3. Reinstall — copy URL: …").

## Out of scope (intentional)

- Auto-applying AI proposals without human review — proposals always need Accept click.
- Per-user (vs per-org) mutes — keep it simple; orgs share one tuning surface.
- Editing the AI prompt itself in UI — the system prompt evolves via code review (it's already category-aware).
- Multi-language reaction prompts beyond Norwegian/English — both already covered by emoji-only feedback.

## Verification

1. Send conversation containing "betaling feilet" → Slack header reads `💳 *Betalingsproblem* — {subject}`, amber color, push notification mirrors header.
2. React 👎 on the alert → row appears in `critical_alert_feedback`. Open Triage Health → 👎 rate visible on that trigger.
3. React 🔇 on a "feil" alert → row in `critical_keyword_mutes` with 7d expiry; next conversation containing only "feil" does NOT alert (logged in edge logs as muted-skip); after expiry, alerts resume.
4. Demote "feil" in Keyword Tuning → `slack_integrations.critical_keyword_overrides.disabled` includes `"feil"`; verify edge function `getEffectiveKeywords()` excludes it.
5. Set `billing_issue` threshold to 4 → AI alert with severity 3 in that category does NOT fire; severity 4 still fires.
6. Trigger `triage-pattern-mining` manually → proposals appear in dashboard with reasoning + evidence links; Accept writes to overrides; Reject marks status.
7. Audit log on `slack_integrations` shows every override change with old/new JSON (existing trigger handles this).

