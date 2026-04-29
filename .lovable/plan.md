# Phase B1 — Meta Lead Ads: Edit/Delete + Token Refresh + Health Dashboard

## 1. Database migration

Add three columns to `recruitment_meta_integrations`:

- `last_health_check_at TIMESTAMPTZ`
- `last_health_check_result JSONB`
- `token_expires_at TIMESTAMPTZ` (nullable; `null` = never expires)

No RLS changes (existing policies cover the columns).

## 2. Secrets

- Add `META_APP_ID = 27279846134953824` via `add_secret`. `META_APP_SECRET` already exists.
- App access token for `debug_token` is constructed inside the edge function as `${META_APP_ID}|${META_APP_SECRET}`.

## 3. Edge functions (both `verify_jwt = true`)

Both use service role internally to read `page_access_token` (RLS-protected), but require an authenticated caller. JWT is verified by the Edge runtime; functions additionally scope queries by the caller's `organization_id` via a service-role lookup of the integration row's `organization_id` matched against the caller's profile.

### `meta-integration-health-check`

`POST { integration_id }`. Runs against Graph v19.0:

- **A. Token validity** — `GET /me/permissions` → parse `data[]`, build `scopes_present` / `scopes_missing` against the required set: `leads_retrieval`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `pages_manage_ads`.
- **B. Token owner** — `GET /me?fields=id,name` → `is_page_token = (id === integration.page_id)`, capture `owner_name`.
- **C. Token expiry** — `GET /debug_token?input_token=$TOKEN&access_token=$APP_ID|$APP_SECRET` → `expires_at` (0 ⇒ null = never).
- **D. Subscription** — `GET /{page_id}/subscribed_apps` → check our app appears with `leadgen` in `subscribed_fields`.
- **E. Lead retrieval test** — pick first active form mapping, `GET /{form_id}/leads?limit=1` → 200 = pass.
- **F. 24h event stats** — query `recruitment_lead_ingestion_log` grouped by `status` for last 24h.
- **G. Last event** — `max(created_at)` from log + `integration.last_event_at`, take latest.

Overall status:
- `broken` if auth invalid OR not a page token OR subscription inactive OR `scopes_missing` non-empty
- `degraded` if events_24h.failed > events_24h.success
- `healthy` otherwise

Persists to `last_health_check_at`, `last_health_check_result`, `token_expires_at`, `status` (`connected`/`error`), `status_message`. Returns the JSON.

### `meta-integration-test-token`

`POST { integration_id, candidate_token }`. Runs only checks A + B + scope check using the candidate token. Does NOT touch DB. Returns the validation shape from the spec (`valid`, `is_page_token`, `page_id_match`, `scopes_present/missing`, `owner_id/name`, `error_summary`).

Register both in `supabase/config.toml` (default `verify_jwt = true`, no entry needed unless overriding).

## 4. UI refactor — `MetaLeadAdsCard`

Convert the `CardContent` into a shadcn `Tabs` component, default `Tilkobling`:

### Tilkobling tab
- Existing page name / ID / status / "Søknader mottatt" / "Sist mottatt" grid
- Action row replaces single button with three:
  - **Rediger tilkobling** → `MetaConnectionDialog` in `edit` mode
  - **Forny token** → `MetaTokenRefreshDialog`
  - **Slett tilkobling** → `AlertDialog` confirm → delete row (cascade handles mappings/log refs)

### Skjemaer tab
- Move content of `MetaFormMappingDialog` inline into the tab as a list (form name editable inline, form_id read-only with copy, position dropdown, active toggle, delete button + confirm)
- "Legg til skjema" button keeps the add-mapping form

### Helse tab — `MetaHealthTab.tsx`
- Top: overall status badge (green/amber/red) + "Sist sjekket: {relative}" with refresh icon
- **Autentisering** section: token valid, token type (Side-token for {page_name}), expiry, scopes
- **Webhook** section: subscription active, last event, 24h breakdown (12 vellykkede / 0 mislykkede / 1 duplikat colored)
- **Lead-henting** section: can fetch + last success
- Bottom: **Test tilkobling** (runs health-check edge fn, ~5s spinner) + **Vis full mottakslogg** (scrolls to existing `LeadIngestionLogPanel`)

## 5. New dialog — `MetaTokenRefreshDialog.tsx`

Sheet from right with:
- Textarea for new Page Access Token (password-mask toggle)
- "Hvor finner jeg dette? →" opens nested Sheet with static Norwegian instructions for generating a Page Access Token via Meta Business Suite (B2 will replace with wizard)
- **Valider** → `meta-integration-test-token`:
  - valid: green check + summary ("Side: Noddi, Tilganger: alle nødvendige, Utløper: Aldri") + enables Lagre
  - invalid: red error with `error_summary`, Lagre disabled
- **Lagre** → updates `page_access_token`, runs health check, toast "Token oppdatert", closes

Same dialog reused from Helse tab when auth check fails.

## 6. `MetaConnectionDialog` — add `edit` mode

- `page_id` becomes read-only with caption "Kan ikke endres etter oppretting"
- `page_name` editable
- `page_access_token` shown as masked dots + **Endre** button → opens `MetaTokenRefreshDialog` (no inline editing)
- `verify_token` read-only with copy button (already present)
- New "Slett tilkobling" button bottom-left with `AlertDialog`

## 7. Hooks

- `src/hooks/useMetaIntegrationHealth.ts` — React Query reading cached `last_health_check_result` from DB row (instant load); `staleTime: 5min`, `refetchOnMount: 'always'`, `refetchInterval: 5min`.
- `src/hooks/useTestMetaConnection.ts` — mutation calling `meta-integration-health-check`; on success invalidates the health query.

## 8. Files

**New**
- `supabase/migrations/<ts>_meta_health_columns.sql`
- `supabase/functions/meta-integration-health-check/index.ts`
- `supabase/functions/meta-integration-test-token/index.ts`
- `src/components/dashboard/recruitment/admin/integrations/MetaTokenRefreshDialog.tsx`
- `src/components/dashboard/recruitment/admin/integrations/MetaHealthTab.tsx`
- `src/hooks/useMetaIntegrationHealth.ts`
- `src/hooks/useTestMetaConnection.ts`

**Modified**
- `src/components/dashboard/recruitment/admin/integrations/cards/MetaLeadAdsCard.tsx` (tabbed layout)
- `src/components/dashboard/recruitment/admin/integrations/meta/MetaConnectionDialog.tsx` (edit mode, delete button, masked token)
- `src/components/dashboard/recruitment/admin/integrations/types.ts` (extend `MetaIntegration` with new fields + `HealthCheckResult` types)
- `src/components/dashboard/recruitment/admin/integrations/IntegrationsTab.tsx` (wire new dialog state + delete handler)
- `src/components/dashboard/recruitment/admin/integrations/hooks/useMetaIntegration.ts` (add `deleteIntegration` mutation if missing)

`supabase/config.toml`: no edits needed — both new functions default to `verify_jwt = true`.

## 9. Verification after ship

1. Migration applied; columns visible.
2. Both edge functions deploy cleanly.
3. `META_APP_ID` secret confirmed.
4. Run health check against existing Noddi integration; paste returned JSON; expect `overall_status: "healthy"`.
5. UI walkthrough: 3 tabs, edit flow (page_id read-only), token refresh (valid + invalid), delete confirmation, health tab synthetic test (corrupt token via SQL → red status → restore → green).
6. TypeScript clean.

## Out of scope (deferred)

- Connection wizard (B2)
- Form-field-to-applicant mapping UI (B3)
- Bulk lead backfill import (B3)
- Full OAuth migration (post App Review)
