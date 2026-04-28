# Phase B — Meta Lead Ads webhook handler

Build the Edge Function that receives Meta Lead Ads submissions, dedupes, creates applicants/applications, and logs all attempts. Foundation (integrations, form mappings, ingestion log, `applicants.external_id` unique partial index) already exists from Phase 6.

## Deliverables

### 1. New file: `supabase/functions/meta-lead-webhook/index.ts`

A single Deno edge function handling three flows:

**OPTIONS** → CORS preflight (200, includes `X-Hub-Signature-256` in allowed headers).

**GET** (Meta subscription verification):
- Read `hub.mode`, `hub.verify_token`, `hub.challenge` from query string.
- Reject with 400 if any missing or `mode !== 'subscribe'`.
- Look up `recruitment_meta_integrations` by `verify_token` (service role).
- If no match → 403. If match → return raw `challenge` as `text/plain` 200.

**POST** (lead delivery):
- Read raw body **once** as text (needed verbatim for HMAC).
- JSON.parse with try/catch — on parse failure return 200 (never trigger Meta retry storm).
- For each `entry` in body:
  - Look up integration by `entry.id` (page_id). Unknown page → `console.log` and skip.
  - HMAC verify: compute `sha256=` + `createHmac('sha256', META_APP_SECRET).update(rawBody).digest('hex')`, compare against `x-hub-signature-256`. Mismatch → log `status='invalid'` row with `error_message='HMAC signature mismatch'`, continue.
  - For each `change` where `change.field === 'leadgen'`:
    - Extract `leadgen_id`, `form_id`, `created_time` from `change.value`.
    - **Dedup**: SELECT applicant by `(organization_id, external_id=leadgen_id)`. Match → log `status='duplicate'` with applicant_id, continue.
    - **Graph API fetch**: `GET https://graph.facebook.com/v19.0/{leadgen_id}?access_token={page_access_token}`. On error/throw → log `status='failed'` with message, continue.
    - Build `fieldMap` from `field_data[]` (`name → values[0]`).
    - Resolve `full_name` (or `name`), `email` (or `email_address`), `phone_number` (or `phone`, nullable).
    - Validate at least name OR email present → otherwise log `status='invalid'`, continue.
    - Split full_name on whitespace: `firstName=parts[0]`, `lastName=parts.slice(1).join(' ') || '—'`.
    - Look up `recruitment_meta_form_mappings` by `(integration_id, form_id, is_active=true)` to get `position_id`.
    - **Insert applicant** (service role) — only override columns without acceptable defaults:
      - `organization_id`, `first_name`, `last_name`, `email` (fallback `unknown-{leadgen_id}@no-email.local` if missing), `phone`
      - `source='meta_lead_ad'`, `external_id=leadgen_id`
      - `source_details={ field_data, form_id, page_id, created_time }`
      - `gdpr_consent=true`, `gdpr_consent_at=now()`
      - Do NOT pass `language_norwegian`/`work_permit_status`/array columns — DB defaults (`'not_specified'`, `'{}'`) apply cleanly.
    - On insert error: detect `code === '23505'` → `status='duplicate'`; else `status='failed'`. Log and continue.
    - If `mapping?.position_id`: insert `applications` row with `applicant_id`, `position_id`, `organization_id`, `current_stage_id='not_reviewed'`, `applied_at=now()`. (Best-effort — failure logs but does not roll back applicant.)
    - Insert `recruitment_lead_ingestion_log` with `status='success'`, `applicant_id`, `external_id`, `integration_id`, `raw_payload=change.value`.
    - Update integration: `last_event_at=now()`, `status='connected'`, `status_message=null`.
- Always return `200 OK` at the end (Meta retries on non-200 — we surface failures via the ingestion log, never via HTTP).

**Implementation notes**:
- Imports: `createClient` from `https://esm.sh/@supabase/supabase-js@2`, `createHmac` from `https://deno.land/std@0.190.0/node/crypto.ts`.
- Service role client (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS — correct for system ingestion.
- Phase 7 audit triggers fire automatically on applicant + application inserts; `actor_profile_id` will be NULL (system event) — expected and correct.
- One `supabase` client created per request, reused across all entries/changes.
- Wrap the entire POST handler body in a single try/catch that always returns 200 — last line of defense against unexpected throws.

### 2. Modified: `supabase/config.toml`

Add at the bottom of the functions section:

```toml
[functions.meta-lead-webhook]
verify_jwt = false
```

Meta does not send Supabase auth headers — JWT verification must be disabled. Security comes from HMAC signature + verify_token lookup.

### 3. Required secret (cannot be added by Lovable, user must add)

`META_APP_SECRET` — global Meta App Secret from Meta Developer Portal (used for HMAC verification across all integrations). After plan approval, I will use the secret request flow to ask the user to add it.

### 4. UI: no new files needed

Phase 6 already built `MetaLeadAdsCard` (status badge already handles `'connected'` → green "Tilkoblet") and `LeadIngestionLogPanel`. Both will light up automatically once webhook starts firing — `last_event_at` query updates the "Sist mottatt" cell, ingestion log query populates the panel, lead count badge reflects the new rows.

## Out of scope (per user spec)

Field mapping UI for non-standard form questions, token refresh, bulk replay, multi-page UI, automated subscription management.

## Verification I will perform after deploy

1. File exists at `supabase/functions/meta-lead-webhook/index.ts`.
2. `verify_jwt = false` set in `supabase/config.toml`.
3. Curl GET with bogus `verify_token` → 403; with no `hub.mode` → 400.
4. Curl POST with empty body `{}` → 200 (no entries to process).
5. Curl POST with mock `entry` for unknown page_id → 200, no DB writes.
6. Curl POST with mock `entry` for a real test page_id but missing/invalid `x-hub-signature-256` (when `META_APP_SECRET` is set) → 200 + `recruitment_lead_ingestion_log` row with `status='invalid'`.
7. Confirm Phase 7 audit triggers compatible (no manual audit insert needed).

User will handle Meta Developer Portal subscription + form mapping config + real lead test after deploy.

## Reply after implementation

1. Edge function file structure summary
2. HMAC verification confirmation (algorithm, header, raw-body handling)
3. Confirmation all paths return 200 (no 500s to Meta)
4. Dedup confirmation via `idx_applicants_external_id_unique`
5. GET handler curl test result (subscription verification)
6. POST handler curl test with mock body (signature rejection path)
