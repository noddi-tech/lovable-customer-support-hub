# Navio Auth Setup (Authentik + Supabase OIDC)

How to enable **Sign in with Navio** on the Customer Support Hub, matching the
pattern used by [navio-forecast-dashboard](https://github.com/noddi/navio-forecast-dashboard)
(`docs/sso/navio-zendos-auth-setup.md`).

## Goal

- **Sign in with Navio** limited to **navio-core Django superusers** (platform staff).
- Keep Supabase Auth for sessions, RLS, `auth.users`, and existing role/org logic.
- Leave Google, email/password, and magic link for support agents / invites.

## Who can use Sign in with Navio?

Only **Django `is_superuser`** accounts on navio-core. Enforcement is layered:

| Layer | Where | Rule |
| --- | --- | --- |
| 1. navio-core authorize | `api.noddi.co/o/authorize/` for Authentik source client | Rejects non-superusers (`tenant_authz.assert_user_is_superuser_for_client`) |
| 2. Authentik enrollment | navio-core source mapping | Sets `user.type = "internal"` (Google/passkey stay non-internal) |
| 3. Authentik Application | `navio-support-hub` policy binding | Requires `request.user.type == "internal"` |
| 4. Support Hub app | RPC `ensure_authentik_support_hub_access` | After `custom:navio` session, grants `profiles` + `super_admin` |

Google / passkey users on Authentik **cannot** complete OAuth into this Supabase
provider even if they can log into Authentik for other apps.

## Architecture

1. User clicks **Sign in with Navio** on `/auth`.
2. App calls `supabase.auth.signInWithOAuth({ provider: 'custom:navio' })`.
3. Supabase starts OAuth2 + PKCE against the Authentik issuer for the
   `navio-support-hub` application.
4. Authentik only authorizes **internal** users (navio-core superuser path).
5. Supabase creates the session; the client calls
   `ensure_authentik_support_hub_access` to bootstrap `super_admin`.

## Prerequisites

### 1. Authentik OIDC client (infrastructure)

Managed in:

`noddi-infrastructure/services/authentik_config/terraform.py`
→ `_wire_navio_support_hub_oidc`

| Item | Value |
| --- | --- |
| Application slug | `navio-support-hub` |
| Issuer | `https://auth.noddi.co/application/o/navio-support-hub/` |
| Discovery | `https://auth.noddi.co/application/o/navio-support-hub/.well-known/openid-configuration` |
| GSM secret | `navio_support_hub_authentik_oidc` |
| Redirect URIs | `https://qgfaycwsangsqzpveoup.supabase.co/auth/v1/callback` (+ local Supabase CLI) |

Apply the authentik_config stack after merging the infra PR, then pull credentials:

```bash
gcloud secrets versions access latest \
  --secret=navio_support_hub_authentik_oidc \
  --project=noddi-prod
```

Payload:

```json
{
  "client_id": "<opaque-uuid>",
  "client_secret": "<long-random-secret>"
}
```

### 2. Supabase Custom Auth Provider (`custom:navio`)

This step is **not** done by git push / Lovable deploy / Authentik TF alone.
GoTrue must know about the provider, or you get:

```text
Unsupported provider: custom provider custom:navio not found
```

**How forecast did it:** one-time **Dashboard** form on the forecast Supabase
project (documented only — no automation in that repo). Support Hub has a CLI
wrapper around the same Admin API the Dashboard uses.

#### Option A — CLI (recommended)

Requires the project **service_role** key (secret; never commit it):

1. Open [Project Settings → API](https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/settings/api)
2. Copy **service_role**
3. Run:

```bash
export SUPABASE_SERVICE_ROLE_KEY='eyJ…'   # service_role from dashboard
./scripts/configure-navio-oidc.sh
```

What the script does:

1. Reads Authentik client id/secret from GSM `navio_support_hub_authentik_oidc`
2. Checks Authentik discovery is `200`
3. `POST` (or `PUT` if present)  
   `https://qgfaycwsangsqzpveoup.supabase.co/auth/v1/admin/custom-providers`  
   with identifier `custom:navio`, issuer/discovery for `navio-support-hub`,  
   scopes `openid email profile zendos:active`
4. Smoke-tests `/auth/v1/authorize?provider=custom:navio` → expects **302** to `auth.noddi.co`

Optional: `DRY_RUN=1 ./scripts/configure-navio-oidc.sh` prints the payload only.

Equivalent one-liner (after you have JSON credentials from GSM):

```bash
# After: OIDC_JSON=$(gcloud secrets versions access latest --secret=navio_support_hub_authentik_oidc --project=noddi-prod)
curl -sS -X POST \
  "https://qgfaycwsangsqzpveoup.supabase.co/auth/v1/admin/custom-providers" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --argjson o "$OIDC_JSON" \
    '{
      provider_type: "oidc",
      identifier: "custom:navio",
      name: "Navio",
      client_id: $o.client_id,
      client_secret: $o.client_secret,
      issuer: "https://auth.noddi.co/application/o/navio-support-hub/",
      discovery_url: "https://auth.noddi.co/application/o/navio-support-hub/.well-known/openid-configuration",
      scopes: ["openid","email","profile","zendos:active"],
      enabled: true
    }')"
```

#### Option B — Dashboard (same as forecast)

In Supabase project **`qgfaycwsangsqzpveoup`** →
[Authentication → Providers](https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/auth/providers)
→ **New Provider** → **Auto-discovery (OIDC)**:

| Field | Value |
| --- | --- |
| Provider Identifier | `custom:navio` (include the `custom:` prefix) |
| Display Name | `Navio` |
| Issuer URL | `https://auth.noddi.co/application/o/navio-support-hub/` (trailing slash) |
| Discovery URL | `https://auth.noddi.co/application/o/navio-support-hub/.well-known/openid-configuration` |
| Client ID / Secret | From GSM `navio_support_hub_authentik_oidc` |
| Scopes | `openid, email, profile, zendos:active` |
| Enabled | on |

Callback shown by Supabase:

`https://qgfaycwsangsqzpveoup.supabase.co/auth/v1/callback`

(already registered on Authentik).

### 3. App code

Already implemented in `src/pages/Auth.tsx`:

```ts
supabase.auth.signInWithOAuth({
  provider: "custom:navio" as any,
  options: {
    redirectTo: `${window.location.origin}/auth`,
    skipBrowserRedirect: true,
  },
});
// then window.location.assign(data.url)
```

No schema change is required for basic login. Profile rows are created by the
existing `on_auth_user_created` → `handle_new_user` trigger.

## Verification

1. Open `/auth` → **Sign in with Navio**.
2. You should land on `auth.noddi.co` (Authentik).
3. After login, return to the Support Hub as a signed-in user.
4. In Supabase **Authentication → Users**, the identity provider should be
   `custom:navio` / `navio`.

Protocol smoke test (after infra apply + Supabase provider create):

```bash
curl -sI "https://qgfaycwsangsqzpveoup.supabase.co/auth/v1/authorize?provider=custom:navio" | head -10
```

Expect `302` to `https://auth.noddi.co/application/o/authorize/` with the
support-hub client_id and `redirect_uri=…qgfaycwsangsqzpveoup…/auth/v1/callback`.

If you still see `Unsupported provider: custom provider custom:navio not found`,
the Admin create step did not succeed for this project.

## What deploy does **not** do

| Action | Creates Authentik OIDC app | Registers Supabase `custom:navio` | Ships UI button |
| --- | --- | --- | --- |
| `git push` app | no | no | yes (Lovable sync) |
| `tf_apply_authentik_config` | yes | no | no |
| `./scripts/configure-navio-oidc.sh` | no | **yes** | no |
| Supabase Dashboard New Provider | no | **yes** | no |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Unsupported provider: custom provider custom:navio not found` | Provider not registered on this Supabase project | Run `./scripts/configure-navio-oidc.sh` or Dashboard Option B |
| `access_denied: Unverified email with custom:navio` | Authentik default `email` scope sets `email_verified: False` | Infra attaches `navio-support-hub-email-scope` with `email_verified: true`; re-apply authentik_config if missing |
| `OIDC discovery issuer mismatch` | Wrong Issuer/Discovery URL | Use exact URLs above (trailing slash on issuer) |
| Button does nothing / “no redirect URL” | Custom provider missing or misconfigured | Re-run CLI script; check `client_id` from GSM |
| Works in forecast, not here | Different Authentik app + different Supabase project | Support Hub must use `navio-support-hub` issuer + its own GSM secret + **this** project’s service_role |

## Rollback

- Disable/delete the Custom provider in Supabase (instant).
- Hide or remove the Navio button in a deploy.
- Leave the Authentik application registered (zero cost).

## Related

- Forecast reference: `navio-forecast-dashboard/docs/sso/navio-zendos-auth-setup.md`
- Infra: `noddi-infrastructure/services/authentik_config/README.md` (Navio Support Hub section)
- Authentik wiring: `_wire_navio_support_hub_oidc` in `services/authentik_config/terraform.py`
