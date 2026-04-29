# Fix: source Meta scopes from `debug_token`, not `/me/permissions`

`/me/permissions` returns Graph error 100 on **page** access tokens, which makes the health check falsely report all required scopes as missing and flag the integration as `broken`. The page token actually works (`can_fetch_forms: true` proves it). `debug_token` returns the granted scopes for both user and page tokens.

## Changes

### 1. `supabase/functions/meta-integration-health-check/index.ts`

- Drop `permsRes` from the `Promise.all` parallel block (keep `meRes`, `debugRes`, `subsRes`).
- Replace the entire "Auth section" (lines ~157–167) with the debug_token-sourced version:
  - `authValid` ← `debugRes.data.data.is_valid === true`
  - `scopes_present` / `scopes_missing` derived from `debugRes.data.data.scopes` (string array)
  - `authError` ← `debugRes.data.data.error?.message` when invalid, or `debugRes.error` if the call itself failed
- Everything else (owner id/name from `meRes`, expiry from `debugRes`, subscription from `subsRes`, lead retrieval, event stats, overall status logic) stays unchanged.

### 2. `supabase/functions/meta-integration-test-token/index.ts`

- Add `META_APP_ID` / `META_APP_SECRET` reads at the top of the handler (env vars).
- Replace the parallel `permsRes` + `meRes` block with: `meRes` in parallel with a new `debugRes` against `debug_token` using `${META_APP_ID}|${META_APP_SECRET}` as the app access token.
- Build `granted` from `debugRes.data.data.scopes` if present; otherwise fall back to a sequential `/me/permissions` call (handles older user tokens where `debug_token` may omit scopes).
- Compute `scopes_present` / `scopes_missing` from that `granted` set. Keep the rest of the response shape, ownership check, and error summary logic unchanged.

## Deploy & verify

1. Deploy both functions (`meta-integration-health-check`, `meta-integration-test-token`).
2. From the **Helse** tab, run the health check against integration `22455007-ce79-4872-b0d2-998212d4dcb2`.
3. Paste the returned JSON. Expectation: `overall_status: "healthy"`, `auth.scopes_missing: []`, `auth.valid: true`, `lead_retrieval.can_fetch_forms: true`.

## Out of scope

No UI changes, no schema changes, no secret changes (`META_APP_ID` and `META_APP_SECRET` are already configured).
