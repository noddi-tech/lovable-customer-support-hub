# Navio Auth Setup (product IdP + Supabase OIDC)

**Sign in with Navio** uses the product identity plane: the Navio backend
OIDC IdP at **`https://auth.noddi.co/o`** (`apps.idp`), same path as
[navio-forecast-dashboard](https://github.com/noddi-tech/navio-forecast-dashboard)
(`docs/sso/navio-core-auth-setup.md`).

Shared TypeScript helpers live in **`@navio/zidp`** (backend package):

- `PRODUCT_OIDC_ISSUER` / `PRODUCT_OIDC_DISCOVERY_URL` / `PRODUCT_OIDC_SCOPES`
- `isNavioCoreOidcUser` — detect Supabase `custom:navio` sessions
- `parseSupabaseUser` / claim helpers

Architecture: [noddi-infrastructure `docs/idp.md`](https://github.com/noddi-tech/noddi-infrastructure/blob/main/docs/idp.md).

## Goal

- **Sign in with Navio** limited to **navio-core Django superusers** (platform staff).
- Keep Supabase Auth for sessions, RLS, `auth.users`, and existing role/org logic.
- Leave Google, email/password, and magic link for support agents / invites.

## Who can use Sign in with Navio?

Only **Django `is_superuser`** accounts on navio-core. Enforcement:

| Layer | Where | Rule |
| --- | --- | --- |
| 1. Product authorize | `auth.noddi.co/o/authorize/` for client name `navio-support-hub` | Rejects non-superusers (`tenant_authz.PRODUCT_SUPERUSER_ONLY_CLIENT_NAMES`) |
| 2. Support Hub app | RPC `ensure_authentik_support_hub_access` | After `custom:navio` session, grants `profiles` + `super_admin` |

## Login flow

1. User clicks **Sign in with Navio** on `/auth`.
2. App calls `supabase.auth.signInWithOAuth({ provider: 'custom:navio' })`.
3. Supabase starts OAuth2 + PKCE against **`https://auth.noddi.co/o`**.
4. User authenticates on Navio Core login (superuser gate).
5. Supabase creates the session; the client calls
   `ensureNavioSupportHubAccess` (`@/lib/auth-provision` → RPC).

```text
Browser → Support Hub SPA → Supabase Auth → auth.noddi.co/o (product IdP)
                              ↑
                    ID token + navio:active claims
```

## Prerequisites

### 1. Product OIDC client (navio-core)

```bash
# on noddi-backend-api (prod DB) — name MUST be navio-support-hub for superuser gate
uv run manage.py upsert_product_oidc_client \
  --client-id "$CLIENT_ID" \
  --client-secret "$CLIENT_SECRET" \
  --name navio-support-hub \
  --display-name "Navio Support Hub" \
  --redirect-uri https://qgfaycwsangsqzpveoup.supabase.co/auth/v1/callback \
  --redirect-uri http://127.0.0.1:54321/auth/v1/callback \
  --redirect-uri http://localhost:54321/auth/v1/callback
```

Store credentials in GSM (recommended secret id:
`navio_support_hub_oidc` in `noddi-prod`).

### 2. Supabase Custom Auth Provider (`custom:navio`)

| Field | Value |
| --- | --- |
| Provider identifier | `navio` → SDK `custom:navio` |
| Display name | `Navio` |
| **Issuer URL** | `https://auth.noddi.co/o` |
| **Discovery URL** | `https://auth.noddi.co/o/.well-known/openid-configuration` |
| Scopes | `openid, email, profile, navio:active` |
| Client ID / secret | GSM product client (not Authentik) |

#### CLI (recommended)

```bash
export SUPABASE_SERVICE_ROLE_KEY='eyJ…'   # service_role from dashboard
# Optional: PRODUCT_OIDC_SECRET=navio_support_hub_oidc
./scripts/configure-navio-oidc.sh
```

The script reads the product OIDC client from GSM, checks discovery on
`auth.noddi.co`, and upserts the Supabase custom provider with `navio:active`.

## Client code (this repo)

| File | Role |
| --- | --- |
| `src/pages/Auth.tsx` | **Sign in with Navio** → `custom:navio` |
| `src/lib/auth-provision.ts` | Thin wrapper: zidp detection + Support Hub RPC |
| `src/components/auth/AuthContext.tsx` | Provision on OAuth / SIGNED_IN |
| `@navio/zidp` | Shared issuer constants + `isNavioCoreOidcUser` |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Lands on Authentik / `auth.zendos.io` | Supabase issuer still points at Authentik app |
| `superuser_required` 403 | User is not Django superuser on navio-core |
| `access_denied: Unverified email` | Product IdP must emit `email_verified: true` |
| `Unsupported provider: custom:navio` | Run `./scripts/configure-navio-oidc.sh` |
| `invalid_client` | Wrong client_id/secret or redirect URI not on `OidcClient` |

## Related

- Forecast setup: `navio-forecast-dashboard/docs/sso/navio-core-auth-setup.md`
- Backend IdP: `noddi-backend-api/docs/developer/idp.md`
- Claims + shared helpers: `@navio/zidp`
