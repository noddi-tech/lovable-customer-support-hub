# Phase B2 — Meta Connection Wizard (revised)

5-step wizard replacing create-mode of `MetaConnectionDialog`. OAuth (primary) + manual paste (fallback). Plus Meta-required compliance endpoints, dynamic origin allowlist, and full OAuth error handling.

## Architecture confirmation

**Redirect URI registered in Meta App (single, static):**
```
https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/meta-oauth-callback
```

**Origin handling — dynamic, NOT static APP_URL.** Confirmed: we use the addendum's allowlist approach so Lovable previews + prod both work. No `APP_URL` secret.

Allowlist (matched in `meta-oauth-init` against the request `Origin` header):
- `https://support.noddi.co`
- `https://lovable-customer-support-hub.lovable.app`
- `https://*.lovable.app` and `https://*.sandbox.lovable.dev` (regex match)
- `http://localhost:3000`, `http://127.0.0.1:3000`

Origin is validated, stored on the `oauth_states` row as `origin TEXT NOT NULL`, and the callback redirects to that stored origin. Anything not on the allowlist → 403 from `meta-oauth-init` (request never reaches FB).

**State handoff:**

```text
Browser (wizard step 2)
   │  POST meta-oauth-init {Origin: <browser origin>}
   │     ─► validate origin against allowlist
   │     ─► insert oauth_states {nonce, origin, expires_at = now()+10m}
   │     ─► return { auth_url, state_id }
   ▼
window.location = auth_url  (full redirect)
   ▼
Facebook consent
   │   user approves                          user denies
   ▼                                           ▼
GET callback?code=...&state=...    GET callback?error=access_denied&state=...
   │  validate nonce/expiry           │  parse error param
   │  exchange code → long-lived       │  load state row → recover origin
   │  fetch /me, stash on state row    │  302 → {origin}/admin/recruitment
   │  302 → {origin}/admin/recruitment        ?tab=integrations&meta_oauth_error=user_denied
        ?tab=integrations&meta_oauth_state={state_id}
```

Wizard reads `?meta_oauth_state` (success) or `?meta_oauth_error` (failure) on mount. Error param surfaces a friendly toast + reopens wizard at step 2 with retry.

**`pages_manage_ads` fallback in step 5:** if `/{page_id}/leadgen_forms` returns scope error, surface friendly message, "Fullfør uten skjemamapping" button — does NOT block, does NOT mark integration broken, does NOT add `pages_manage_ads` to required scopes (matches prior memory).

## Database changes (one migration)

**ALTER `recruitment_meta_integrations`** (additive):
- `user_access_token TEXT NULL`
- `user_token_expires_at TIMESTAMPTZ NULL`
- `connected_via TEXT NOT NULL DEFAULT 'manual' CHECK (connected_via IN ('manual','oauth'))`
- `oauth_user_id TEXT NULL`
- `oauth_user_name TEXT NULL`
- `deauthorized_at TIMESTAMPTZ NULL` (set by `meta-deauthorize`)

**CREATE `recruitment_meta_oauth_states`:**
- `id UUID PK DEFAULT gen_random_uuid()`
- `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
- `user_id UUID NOT NULL`
- `nonce TEXT NOT NULL`
- `origin TEXT NOT NULL` ← addendum
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `expires_at TIMESTAMPTZ NOT NULL`
- `consumed_at TIMESTAMPTZ NULL`
- `long_lived_user_token TEXT NULL`
- `token_expires_at TIMESTAMPTZ NULL`
- `oauth_user_id TEXT NULL`
- `oauth_user_name TEXT NULL`
- INDEX `(nonce)`, `(organization_id, created_at DESC)`
- RLS: org-scoped SELECT/INSERT/DELETE; service role used by callback.

**CREATE `recruitment_meta_data_deletion_requests`:**
- `id UUID PK DEFAULT gen_random_uuid()`
- `confirmation_code TEXT UNIQUE NOT NULL` (random 24-char)
- `oauth_user_id TEXT NOT NULL`
- `organization_id UUID NULL`
- `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed'))`
- `created_at TIMESTAMPTZ DEFAULT now()`
- `completed_at TIMESTAMPTZ NULL`
- `details JSONB NULL`
- RLS: public SELECT by `confirmation_code` only (for the status page); writes service-role only.

Cron: extend nightly cleanup to delete `recruitment_meta_oauth_states` rows older than 1h, and `recruitment_meta_data_deletion_requests` older than 30 days.

## Edge functions

### a. `meta-oauth-init` (POST, `verify_jwt = true`)
- Auth via `getClaims`, resolve org from `profiles`.
- **Read `Origin` header. Validate against allowlist (regex for wildcard subdomains). 403 if no match.**
- 32-byte hex nonce via `crypto.getRandomValues`.
- Insert `oauth_states` with `origin = <validated origin>`, `expires_at = now() + 10 min`.
- Build FB OAuth URL (`v25.0/dialog/oauth`) with `redirect_uri` pointing to the static callback function URL, `state = {state_id}:{nonce}`, scopes `leads_retrieval,pages_show_list,pages_read_engagement,pages_manage_metadata,pages_manage_ads`, `response_type=code`.
- Return `{ auth_url, state_id }`.

### b. `meta-oauth-callback` (GET, `verify_jwt = false`)
- Read `code`, `state`, `error`, `error_reason`, `error_description` query params.
- Parse `state = {state_id}:{nonce}`. SELECT row by `state_id` (service role).
- **If row missing/invalid:** redirect to first-allowlisted origin (`https://support.noddi.co`) with `meta_oauth_error=invalid_state`.
- **If `error` param present (user denied or FB error):** load origin from state row, mark `consumed_at`, 302 → `{origin}/admin/recruitment?tab=integrations&meta_oauth_error=user_denied` (or `meta_oauth_error=fb_error&detail=<error_code>` for non-denial errors).
- **Else (happy path):** validate nonce, not consumed, not expired. Exchange code → short-lived → long-lived user token. `GET /me?fields=id,name`. UPDATE state row with token + expiry + user info + `consumed_at`. 302 → `{origin}/admin/recruitment?tab=integrations&meta_oauth_state={state_id}`.
- Any exchange/network failure: 302 → `{origin}/admin/recruitment?tab=integrations&meta_oauth_error=exchange_failed` (no token in URL).

### c. `meta-oauth-list-pages` (POST, `verify_jwt = true`)
Body `{ state_id }`. Validates org ownership + presence of long-lived token. Calls `/me/accounts?fields=id,name,access_token,tasks`. Returns `{ pages: [{id, name, can_manage}] }` — page tokens NOT sent to client.

### d. `meta-oauth-finalize` (POST, `verify_jwt = true`)
Body `{ state_id, page_id }`. Re-derives page token server-side via `/{page_id}?fields=name,access_token` with the long-lived user token. POST `/{page_id}/subscribed_apps` with `subscribed_fields=leadgen`. UPSERT `recruitment_meta_integrations` with `connected_via='oauth'`, both tokens, oauth user info. Regenerate `verify_token` only when inserting new row. DELETE state row. Return integration.

### e. `meta-integration-subscribe-webhook` (POST, `verify_jwt = true`) — manual-path companion
Body `{ integration_id }`. Loads page_access_token from row (RLS-checked via caller's claims). POSTs `/{page_id}/subscribed_apps`. Updates status to `connected` on success.

### f. `meta-deauthorize` (POST, `verify_jwt = false`) — Meta compliance
Endpoint registered in Meta App dashboard as "Deauthorize Callback URL". Meta calls this with a signed_request when a user removes the app. Verify signed_request HMAC with `META_APP_SECRET`. Extract `user_id`. Find any `recruitment_meta_integrations` rows where `oauth_user_id = user_id`, set `status='disconnected'`, `deauthorized_at=now()`, `status_message='Bruker fjernet appen fra Facebook'`. Return 200 with empty body (Meta requirement).

### g. `meta-data-deletion` (POST, `verify_jwt = false`) — Meta compliance
Endpoint registered as "Data Deletion Request URL". Verify signed_request. Extract `user_id`. Generate `confirmation_code` (24-char random). Insert `recruitment_meta_data_deletion_requests` row with status `pending`. Async (background): delete page tokens, user tokens, oauth_user_id from any matching integrations; on success mark request `completed`. Return JSON `{ url: "https://support.noddi.co/data-deletion-status/{code}", confirmation_code: "{code}" }` (Meta requirement).

### h. Modify `meta-integration-test-token`
Add error-summary branch: if `connected_via='oauth'` and `< 7 days` to expiry, return `"Token utløper om {N} dager — du kan oppdatere ved å koble til på nytt via wizardet."`

`config.toml`:
```
[functions.meta-oauth-init]      verify_jwt = true
[functions.meta-oauth-callback]  verify_jwt = false
[functions.meta-oauth-list-pages] verify_jwt = true
[functions.meta-oauth-finalize]  verify_jwt = true
[functions.meta-integration-subscribe-webhook] verify_jwt = true
[functions.meta-deauthorize]     verify_jwt = false
[functions.meta-data-deletion]   verify_jwt = false
```

No new secrets needed (`META_APP_ID`, `META_APP_SECRET` already configured; no `APP_URL`).

## Frontend

### New files
- `src/components/dashboard/recruitment/admin/integrations/meta/wizard/MetaConnectionWizard.tsx` (root Dialog)
- `.../wizard/StepIndicator.tsx`
- `.../wizard/Step1Prerequisites.tsx`
- `.../wizard/Step2SelectPage.tsx`
- `.../wizard/Step3Permissions.tsx`
- `.../wizard/Step4Webhook.tsx`
- `.../wizard/Step5Forms.tsx`
- `src/components/dashboard/recruitment/admin/integrations/hooks/useMetaOAuth.ts` (`useStartMetaOAuth`, `useMetaOAuthState`, `useMetaPageList`, `useFinalizeMetaOAuth`, `useMetaFormDiscovery`, `useSubscribeWebhookManual`)
- `src/pages/DataDeletionStatus.tsx` — public page at `/data-deletion-status/:code`. Loads request row by `confirmation_code` (RLS allows public SELECT by this column only). Displays status, request date, completion date. Norwegian copy. Listed in router as a public route (no auth).

### Wizard behavior
- Mounted once at `IntegrationsTab` level (memory #3).
- On mount: read `?meta_oauth_state` → open at step 2 with that state_id; read `?meta_oauth_error` → open at step 2 with toast (`user_denied` → "Du avbrøt tilkoblingen på Facebook. Prøv igjen."; `invalid_state`/`expired` → "Forespørselen utløp. Prøv igjen."; `exchange_failed` → "Kunne ikke fullføre tilkoblingen. Prøv igjen eller kontakt support.").
- Local state: `currentStep`, `selectedPath`, `oauthStateId`, `selectedPageId`, `manualForm`, `mappedForms`, `mode: 'create' | 'reconnect'`.
- Steps 1–3 show top-right close; steps 4–5 hide it (AlertDialog confirm via Avbryt button — DELETE oauth_states row on confirm).
- `useMetaOAuthState`, `useMetaPageList`: `refetchOnMount: 'always'` (memory #5).
- After successful redirect, wizard strips `?meta_oauth_state` / `?meta_oauth_error` from the URL on mount.

### Reconnect mode
"Koble til på nytt" button under MetaHealthTab opens wizard with `mode='reconnect'`, skips step 1, UPSERTs against existing integration on finalize without regenerating `verify_token`.

### IntegrationsTab + MetaLeadAdsCard wiring
- IntegrationsTab mounts `<MetaConnectionWizard>`. `onMetaConnect` opens wizard. Old `MetaConnectionDialog` retained only for edit-mode of existing integration.
- MetaLeadAdsCard "Endre token" splits into a small `DropdownMenu` (`modal={false}` per memory #3) with "Koble til på nytt (anbefalt)" → wizard reconnect, and "Skriv inn manuelt" → existing `MetaTokenRefreshDialog`.

## Out of scope
Field mapping per form (B3a), bulk historical import (B3b), token auto-refresh cron, multi-app, multi-page per integration.

## Verification matrix

1. Migration applied: new integration columns, oauth_states + data_deletion_requests tables, RLS policies, public SELECT by code on deletion table.
2. All 7 functions deployed; `config.toml` verify_jwt correct.
3. Allowlist behavior: call `meta-oauth-init` with disallowed `Origin` → 403; with `https://support.noddi.co` → 200; with `https://*.lovable.app` preview → 200; with `http://localhost:3000` → 200.
4. Manual regression: delete current integration → wizard manual path → integration created via `meta-integration-subscribe-webhook` → real webhook fires.
5. OAuth happy path against `22455007-…`: full round-trip → step 5 shows forms (or fallback) → row has `connected_via='oauth'`, `oauth_user_id`/`oauth_user_name` populated, both tokens stored → health check `healthy`.
6. **OAuth user-denied path:** start flow, click "Cancel" on FB consent → callback receives `error=access_denied` → 302 to wizard with `?meta_oauth_error=user_denied` → friendly toast.
7. State expiry: hand-edit `expires_at` to past → callback redirects with `meta_oauth_error=invalid_state`.
8. CSRF: tamper nonce → callback rejects, `meta_oauth_error=invalid_state`.
9. **Origin recovery on error:** even when state is invalid, callback falls back to `https://support.noddi.co` (not raw 500).
10. **`meta-deauthorize`:** craft a signed_request with known oauth_user_id, POST to function → matching integration flips to `disconnected` with `deauthorized_at` set; invalid signature → 401.
11. **`meta-data-deletion`:** POST signed_request → returns `{ url, confirmation_code }`; row created `pending`; visit `/data-deletion-status/{code}` → status visible; backend completes deletion of stored tokens → row flips `completed`.
12. `bun tsc --noEmit` clean (harness runs).

## Files touched

**New:**
- `supabase/functions/meta-oauth-init/index.ts`
- `supabase/functions/meta-oauth-callback/index.ts`
- `supabase/functions/meta-oauth-list-pages/index.ts`
- `supabase/functions/meta-oauth-finalize/index.ts`
- `supabase/functions/meta-integration-subscribe-webhook/index.ts`
- `supabase/functions/meta-deauthorize/index.ts`
- `supabase/functions/meta-data-deletion/index.ts`
- `src/components/dashboard/recruitment/admin/integrations/meta/wizard/*` (7 files)
- `src/components/dashboard/recruitment/admin/integrations/hooks/useMetaOAuth.ts`
- `src/pages/DataDeletionStatus.tsx`

**Modified:**
- `supabase/config.toml` (7 verify_jwt entries)
- `supabase/functions/meta-integration-test-token/index.ts` (OAuth expiry warning)
- `src/components/dashboard/recruitment/admin/integrations/IntegrationsTab.tsx` (mount wizard, URL param handling)
- `src/components/dashboard/recruitment/admin/integrations/cards/MetaLeadAdsCard.tsx` (split menu)
- `src/components/dashboard/recruitment/admin/integrations/MetaHealthTab.tsx` ("Koble til på nytt")
- `src/components/dashboard/recruitment/admin/integrations/types.ts` (extend `MetaIntegration`)
- `src/App.tsx` (public route for `/data-deletion-status/:code`)

## Manual Meta App config (PR description)
- Facebook Login product: redirect URI `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/meta-oauth-callback`
- Deauthorize Callback URL: `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/meta-deauthorize`
- Data Deletion Request URL: `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/meta-data-deletion`
- Permissions: `leads_retrieval, pages_show_list, pages_read_engagement, pages_manage_metadata, pages_manage_ads`
