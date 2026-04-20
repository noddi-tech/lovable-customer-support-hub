

## Plan: Split "Tjenestefeil" into App-failure (Tech) vs Service-quality (Ops)

### Problem

`service_failure` today is overloaded — it covers both:
- "appen krasjer", "kan ikke logge inn" → genuinely **tech** (software/app)
- "metallisk lyd etter dekkskifte", "skadet bil", "feil montert" → genuinely **ops** (physical service quality)

So routing one bucket either way is always wrong half the time. The right fix is to split the category, not move the bucket. The previous routing (`service_failure → tech`) stays correct for what its label/examples imply.

### New category model

Replace the single `service_failure` with two clearly separated categories:

| Code | Norwegian label | Emoji | Default bucket | Examples |
|---|---|---|---|---|
| `app_failure` | App-/systemfeil | ⚙️ | tech | "appen krasjer", "kan ikke logge inn", "siden er nede", "betalingsside funker ikke" |
| `service_quality` | Tjenestekvalitet | 🔧 | ops | "metallisk lyd etter dekkskifte", "skade på bil etter service", "feil montert", "dårlig utført" |

Existing categories unchanged: `data_issue` (tech), `billing_issue`, `safety_concern`, `frustrated_customer`, `escalation_request`, `legal_threat` (ops).

`safety_concern` already exists for actual injuries/hazards — `service_quality` covers the broader "the work we did was wrong/poor" gap that's currently being misfiled.

### Changes

#### 1. `supabase/functions/_shared/critical-routing.ts`
- Update `CriticalCategory` union: drop `service_failure`, add `app_failure` and `service_quality`.
- Update `DEFAULT_CATEGORY_BUCKETS`:
  - `app_failure: 'tech'`
  - `service_quality: 'ops'`
  - (everything else unchanged)
- Update `CATEGORY_PRESENTATION` with the two new entries (Norwegian labels, emojis, colors).
- Update `KEYWORD_CATEGORY_HINTS` so:
  - app/login/crash patterns (`app|krasj|logge inn|innlogging|nede|outage|broken`) → `app_failure`
  - service-quality patterns (`metallisk|lyd|skade|feilmontert|feil montert|dårlig utført|reklamasjon|ødelagt etter|skadet under`) → `service_quality`
- Update `inferCategoryFromKeyword` fallback from `'service_failure'` to `'app_failure'` (preserves current "unknown tech-sounding keyword → tech" behavior).
- Update doc comments.

#### 2. `supabase/functions/send-slack-notification/index.ts` (AI triage prompt, lines 161–176)
- Update categories list: `billing_issue, app_failure, service_quality, safety_concern, frustrated_customer, escalation_request, legal_threat, data_issue, none`.
- Replace the rule "Reports a service not working or broken feature" with two distinct rules:
  - "Reports the **app/website/login/payment system** is failing or broken → `app_failure`"
  - "Reports the **physical service we delivered** had a quality problem (noise, damage, faulty installation, work poorly done) → `service_quality`"
- Add a one-line examples block so the model has anchors:
  - `app_failure`: "appen krasjer", "kan ikke logge inn", "betalingsside feiler"
  - `service_quality`: "metallisk lyd etter dekkskifte", "skadet bil etter montering", "feil montert"

#### 3. Backfill of existing data
- One migration that **does not drop** any existing `service_failure` rows (forward-only):
  - In `critical_alert_feedback`: re-label `ai_category = 'service_failure'` → `'app_failure'` (the historic default, matches today's behavior). Reactions remain attached to the right "trigger" since the migration is purely a rename of historic rows, and going forward the AI will pick the correct one of the two.
  - This keeps the Triage Health worst/best lists meaningful and stops the legacy label from showing up in the UI.
  - Note: rows in `notifications.data.ai_category` and `slack_integrations.critical_category_routing` will be patched in the same migration (rename `service_failure` key → `app_failure`).

#### 4. Admin UI ("Kategorier → Team" panel)
- The panel iterates over `CATEGORY_PRESENTATION` from the shared module, so the two new rows appear automatically once #1 ships.
- Update the example sublines for both:
  - **App-/systemfeil** (Tech default) — examples: "appen krasjer", "kan ikke logge inn"
  - **Tjenestekvalitet** (Ops default) — examples: "metallisk lyd", "skade etter service", "feil montert"
- Update the helper "Tips" footer text to reference the new split (no more `billing_issue` example needed; replace with: *"Flytt Tjenestekvalitet til Tech kun hvis tekniske montørverktøy er årsaken."*).

#### 5. No changes needed to
- `slack-event-handler` (just stores whatever `ai_category` arrives)
- `triage-pattern-mining` (operates on whatever categories exist; will start producing proposals for the new ones naturally)
- `review-open-critical` (uses `inferCategoryFromKeyword` which we updated)
- RLS / dashboard plumbing (separate fix, already approved)

### Files touched

- `supabase/functions/_shared/critical-routing.ts`
- `supabase/functions/send-slack-notification/index.ts` (prompt only)
- `src/components/admin/...` the "Kategorier → Team" panel component (label/examples/tips text only — confirmed during implementation)
- One DB migration: rename `service_failure` → `app_failure` in `critical_alert_feedback.ai_category`, `notifications.data->>ai_category`, and `slack_integrations.critical_category_routing` JSON keys.

### Verification

1. Send a test message "appen krasjer på iPhone" → AI returns `app_failure` → header "⚙️ *App-/systemfeil*" → routed to **Tech**.
2. Send a test message "Det kommer metallisk lyd fra hjulet etter dekkskifte" (the original screenshot case) → AI returns `service_quality` → header "🔧 *Tjenestekvalitet*" → routed to **Ops**.
3. `/admin/integrations` → "Kategorier → Team" panel shows both new rows with the right defaults; admins can still override per-org.
4. Triage Health dashboard shows historic `service_failure` reactions merged under "App-/systemfeil" (no orphan label).
5. Per-org override still wins: setting `{"service_quality": "tech"}` for one org routes it to tech for that org only.

