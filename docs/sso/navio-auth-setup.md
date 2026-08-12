# Navio Auth Setup (product IdP + Supabase OIDC)

**Sign in with Navio** uses the product identity plane: the Navio backend
OIDC IdP at **`https://auth.noddi.co/o`** (`apps.idp`), same path as
[navio-forecast-dashboard](https://github.com/noddi-tech/navio-forecast-dashboard)
(`docs/sso/navio-core-auth-setup.md`).

Shared TypeScript helpers live in **`@navio/nidp`** (published to Artifact Registry):

- `signInWithNavio` — shared OAuth entry (`custom:navio` + product scopes)
- `PRODUCT_OIDC_ISSUER` / `PRODUCT_OIDC_DISCOVERY_URL` / `PRODUCT_OIDC_SCOPES`
- `isNavioCoreOidcUser` — detect Supabase `custom:navio` sessions
- `parseSupabaseUser` / claim helpers

Architecture: [noddi-infrastructure `docs/idp.md`](https://github.com/noddi-tech/noddi-infrastructure/blob/main/docs/idp.md).

## Goal

- **Sign in with Navio** via product IdP (`auth.noddi.co/o`) with scope `navio:active`.
- **Data visibility** is scoped by IdP membership claims (service organizations +
  service departments). Users only see orgs/depts they belong to.
- Keep Supabase Auth for sessions, RLS, `auth.users`, and local membership rows
  synced from claims.
- **Google login stays** for Noddi employees (company Google only) and is treated
  as **superuser** (full org access + `super_admin` role), same as claim superuser.
- Email/password and magic link remain for invites / other agents.

## Membership scope (product claims)

After login, the SPA runs `getNavioAuthContext(user)` from `@navio/nidp` and:

1. `ensure_authentik_support_hub_access` — creates/updates **profile only** (no auto `super_admin`)
2. `sync_navio_organization_memberships` — maps claim SO ids → local
   `organizations.navio_organization_id` and upserts `organization_memberships`

Claim superusers (`owner_superuser` / `viewer_superuser` in `navio_active_roles`)
get local `super_admin` and full org access. **Google employee logins** also get
`super_admin` via `ensure_google_employee_support_hub_access` (only employees have
Noddi Google accounts). Everyone else on Navio is limited to membership SOs/SDs.

| Concern | Wire claims | App helper |
| --- | --- | --- |
| Service organizations | `navio_memberships`, `navio_organizations` | `getOrganizations` / `getEffectiveScope` |
| Service departments | `navio_memberships[].departments`, `navio_departments` | `getDepartments` / `getAccessibleServiceDepartments` |
| Superuser | `navio_active_roles` includes `owner_superuser` \| `viewer_superuser` | `effectiveScope.isSuperuser` |

Local mapping columns: `organizations.navio_organization_id`,
`departments.navio_department_id` (+ optional `departments.slug`).

## Who can use Sign in with Navio?

Depends on product OIDC client policy for `navio-support-hub` (may still be
superuser-gated at authorize). **In-app data access is membership-scoped**, not
“Navio login ⇒ see everything.”

## Login flow

1. User clicks **Sign in with Navio** on `/auth`.
2. App calls `signInWithNavio(supabase, redirectTo, { skipBrowserRedirect: true })`
   from `@navio/nidp` (`custom:navio` + product scopes).
3. Supabase starts OAuth2 + PKCE against **`https://auth.noddi.co/o`**.
4. User authenticates on Navio Core login (superuser gate).
5. Supabase creates the session; the client calls
   `bootstrapNavioSupportHubAccess` (`@/lib/auth-provision`):
   profile RPC + membership sync from claims.

```text
Browser → Support Hub SPA → Supabase Auth → auth.noddi.co/o (product IdP)
                              ↑
                    ID token + navio:active claims
                              ↓
              getNavioAuthContext → EffectiveScope → org switcher / queries
```

---

## Step-by-step setup (required for first login)

Do these once per environment. Steps 1–2 are outside Supabase; steps 3–6 are
in the Supabase project **`qgfaycwsangsqzpveoup`**.

### Step 1 — Register product OIDC client (navio-core / backend)

On **noddi-backend-api** against the **prod** DB, register a confidential OIDC
client. The **name must be** `navio-support-hub` (superuser-only gate).

```bash
# Generate secrets once; keep them for Supabase + GSM
export CLIENT_ID="$(openssl rand -hex 16)"
export CLIENT_SECRET="$(openssl rand -hex 32)"

uv run manage.py upsert_product_oidc_client \
  --client-id "$CLIENT_ID" \
  --client-secret "$CLIENT_SECRET" \
  --name navio-support-hub \
  --display-name "Navio Support Hub" \
  --redirect-uri https://qgfaycwsangsqzpveoup.supabase.co/auth/v1/callback \
  --redirect-uri http://127.0.0.1:54321/auth/v1/callback \
  --redirect-uri http://localhost:54321/auth/v1/callback
```

**Redirect URI rules:**

| URI | When needed |
| --- | --- |
| `https://qgfaycwsangsqzpveoup.supabase.co/auth/v1/callback` | **Required** — production Supabase GoTrue callback |
| `http://127.0.0.1:54321/auth/v1/callback` | Local Supabase CLI only |
| `http://localhost:54321/auth/v1/callback` | Local Supabase CLI only |

Store credentials in GSM so the configure script can read them:

```bash
# JSON shape expected by scripts/configure-navio-oidc.sh
echo "{\"client_id\":\"$CLIENT_ID\",\"client_secret\":\"$CLIENT_SECRET\"}" | \
  gcloud secrets create navio_support_hub_oidc \
    --project=noddi-prod \
    --data-file=- \
  || gcloud secrets versions add navio_support_hub_oidc \
    --project=noddi-prod \
    --data-file=-
```

### Step 2 — Confirm product IdP discovery is live

```bash
curl -sS https://auth.noddi.co/o/.well-known/openid-configuration | jq '.issuer, .authorization_endpoint'
# Expect issuer: https://auth.noddi.co/o
```

If this fails, fix backend deploy / DNS for `auth.noddi.co` before continuing.

### Step 3 — Supabase: Site URL + redirect allow-list (Dashboard)

Open:
[Authentication → URL configuration](https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/auth/url-configuration)

| Setting | Value | Why |
| --- | --- | --- |
| **Site URL** | Production Support Hub origin (e.g. `https://support.noddi.co` or your Lovable/prod host) | Default post-auth landing if `redirectTo` is omitted |
| **Redirect URLs** | Every SPA origin that may complete login | GoTrue rejects unknown `redirectTo` values |

Add **all** of these Redirect URLs that you use:

```text
https://<production-support-hub-host>/**
https://<production-support-hub-host>/auth
http://localhost:8080/**
http://localhost:8080/auth
http://127.0.0.1:8080/**
http://127.0.0.1:8080/auth
```

(Vite in this repo uses port **8080**.)

Also keep Supabase’s own callback (always used by the OIDC handshake):

```text
https://qgfaycwsangsqzpveoup.supabase.co/auth/v1/callback
```

Without the SPA origins in **Redirect URLs**, OAuth succeeds at the IdP but
fails when returning to the app (`redirect_uri_mismatch` / “requested path is
invalid”).

### Step 4 — Supabase: Custom OIDC provider `custom:navio`

This is the critical Auth config. Two options — **CLI (recommended)** or
Dashboard.

#### Option A — CLI (recommended)

```bash
# service_role key (secret) from:
# https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/settings/api
export SUPABASE_SERVICE_ROLE_KEY='eyJ…'

# Requires gcloud auth with noddi-prod secret access
./scripts/configure-navio-oidc.sh
```

What the script does:

1. Reads `navio_support_hub_oidc` from GSM (`noddi-prod`)
2. Verifies discovery on `https://auth.noddi.co/o`
3. Creates or updates Auth Admin provider `custom:navio`
4. Smoke-tests `GET /auth/v1/authorize?provider=custom:navio` → expects redirect to `auth.noddi.co`

#### Option B — Dashboard (manual)

1. Open [Authentication → Sign In / Providers](https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/auth/providers)
   (or **Custom OIDC** / **Add provider** depending on dashboard version).
2. Add a **Custom OIDC** provider with:

| Field | Exact value |
| --- | --- |
| **Provider identifier** | `navio` (SDK uses `custom:navio`) |
| **Display name** | `Navio` |
| **Client ID** | From GSM / step 1 `client_id` |
| **Client secret** | From GSM / step 1 `client_secret` |
| **Issuer URL** | `https://auth.noddi.co/o` |
| **Discovery URL** | `https://auth.noddi.co/o/.well-known/openid-configuration` |
| **Scopes** | `openid email profile navio:active` (or comma form: `openid, email, profile, navio:active`) |
| **Enabled** | On |
| **PKCE** | On (if exposed) |
| **Email optional** | Off |

3. Save.

**Do not** point issuer at Authentik (`auth.zendos.io` / `auth.navio.io`) for
this product login path.

#### Smoke-test after step 4

```bash
curl -sS -D- -o /dev/null \
  'https://qgfaycwsangsqzpveoup.supabase.co/auth/v1/authorize?provider=custom:navio' \
  | grep -i '^location:'
# Expect Location: https://auth.noddi.co/o/authorize?...
```

If you see `Unsupported provider` or no redirect to `auth.noddi.co`, step 4 is
incomplete.

### Step 5 — Supabase: DB migration (provision RPC)

The app calls RPC **`ensure_authentik_support_hub_access`** after a successful
`custom:navio` session. Migration:

`supabase/migrations/20260803140000_authentik_superuser_access.sql`

Ensure it is applied on the hosted project:

```bash
# From this repo, with Supabase CLI linked to the project
supabase db push
# or apply via Dashboard SQL if you manage migrations differently
```

Verify:

```sql
select proname
from pg_proc
where proname = 'ensure_authentik_support_hub_access';

-- should be executable by authenticated
select has_function_privilege('authenticated', 'public.ensure_authentik_support_hub_access()', 'execute');
```

If the RPC is missing you will see `PGRST202` in the browser console after
login succeeds at the IdP.

### Step 6 — Supabase: (optional) inspect users after first login

After a successful test login:

1. [Authentication → Users](https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/auth/users)
2. Confirm a user exists with identity provider **`navio`** / `custom:navio`
3. In SQL editor, confirm profile + role:

```sql
select u.id, u.email, u.raw_app_meta_data->>'provider' as provider
from auth.users u
order by u.created_at desc
limit 5;

-- profiles / super_admin checks depend on your schema; the RPC is the source of truth
select * from public.ensure_authentik_support_hub_access(); -- as authenticated session
```

### Step 7 — App-side checklist (this repo)

Already implemented; no Supabase UI work:

| Item | Status |
| --- | --- |
| `@navio/nidp@^0.8.0` + `.npmrc` Artifact Registry | App dependency |
| `signInWithNavio` on `/auth` | `src/pages/Auth.tsx` |
| Provision + membership sync on OAuth / `SIGNED_IN` | `AuthContext` + `auth-provision.ts` |
| Claim → scope helpers | `src/lib/auth-scope.ts` |
| Local install | `bun install` (needs network to `europe-north1-npm.pkg.dev`) |
| Map local orgs to Navio SO | set `organizations.navio_organization_id` |

---

## Quick checklist

- [ ] OIDC client `navio-support-hub` on product IdP with Supabase callback redirect
- [ ] GSM secret `navio_support_hub_oidc` (or pass credentials into Dashboard)
- [ ] Discovery `https://auth.noddi.co/o/.well-known/openid-configuration` returns 200
- [ ] Supabase **Site URL** + **Redirect URLs** include SPA origins (`localhost:8080`, prod host)
- [ ] Supabase Custom OIDC provider `navio` → issuer `https://auth.noddi.co/o`, scopes include `navio:active`
- [ ] Authorize smoke-test redirects to `auth.noddi.co`
- [ ] Migration `ensure_authentik_support_hub_access` applied
- [ ] Test with a **Django superuser** account on navio-core

## Client code (this repo)

| File | Role |
| --- | --- |
| `src/pages/Auth.tsx` | **Sign in with Navio** → `signInWithNavio` (`@navio/nidp`) |
| `src/lib/auth-provision.ts` | Detection, profile provision, membership sync from claims |
| `src/lib/auth-scope.ts` | EffectiveScope (SO/SD) from claims + local map |
| `src/components/auth/AuthContext.tsx` | Bootstrap on OAuth / `SIGNED_IN`; exposes `navioClaims` |
| `src/hooks/useAuth.tsx` | `effectiveScope`, `allowedLocalOrgIds`, switcher inputs |
| `@navio/nidp` | Shared login helper, issuer constants, claim helpers |
| `scripts/configure-navio-oidc.sh` | Upsert Supabase Custom OIDC provider from GSM |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Lands on Authentik / `auth.zendos.io` | Supabase issuer still points at Authentik app — re-run step 4 with product issuer |
| `Unsupported provider: custom:navio` | Provider not created — run `./scripts/configure-navio-oidc.sh` or Dashboard step 4 |
| `redirect_uri_mismatch` / invalid redirect | Add SPA origin to Supabase **Redirect URLs** (step 3) **and** product `OidcClient` redirect (step 1) |
| `superuser_required` 403 | Product client still superuser-only; use allowed account or change client policy |
| Sees no organizations after login | Missing SO memberships, or `organizations.navio_organization_id` not mapped |
| Sees all orgs after Navio login | Old auto-super_admin; apply migration `20260812180000_nidp_membership_scope.sql` |
| `access_denied: Unverified email` | Product IdP must emit `email_verified: true` |
| `invalid_client` | Wrong client_id/secret or redirect URI not on `OidcClient` |
| `PGRST202` after login | Apply migrations for provision + `sync_navio_organization_memberships` |
| Login button does nothing / no URL | Provider disabled or misconfigured; check browser console `[auth]` logs |
| `Could not start Navio sign-in (no redirect URL)` | Same as unsupported provider — step 4 incomplete |
| Empty org graph warning in console | Supabase scopes missing `navio:active`, or user has no memberships |

## Duplicate accounts — `Multiple accounts with the same email … linking domain`

Symptom (Navio login, both Navio + Google enabled):

```
[auth] OIDC callback error: server_error -
Multiple accounts with the same email address in the same linking domain detected: default
```

**Cause — data, not code.** Supabase GoTrue auto-links a new OIDC identity to an
existing user *by verified email* (all providers share the `default` linking
domain). If **two or more `auth.users` rows already share that email** (e.g. a
Google account **and** an older password/invite/earlier-attempt account), GoTrue
cannot choose which to link → aborts the callback. Google + Navio both emitting
`email_verified: true` is required for linking but does **not** fix an existing
duplicate.

**Durable rule: one `auth.users` row per email.** With a single user, Google and
Navio identities auto-link onto it and login just works.

### 1. Diagnose (Supabase SQL editor)

```sql
select * from public.admin_list_duplicate_auth_emails();
-- each row: email, user_ids[], details[] (created_at, providers, has_profile, roles)
```

Pick the **canonical** user = the one actually used (has profile + roles +
provider `google`/`navio`). The other(s) are duplicates to fold in.

### 2. Fix (admin `super_admin`, via the `admin-cleanup-users` edge function)

```bash
BASE=https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/admin-cleanup-users
JWT='<super_admin user access token>'   # not the anon/service key

# List duplicates
curl -sS "$BASE?mode=duplicates" -H "Authorization: Bearer $JWT" | jq

# Merge a duplicate into the canonical, then delete the duplicate.
# Reassigns public user-ref columns from -> to, then removes the empty dup.
curl -sS -X POST "$BASE" -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' \
  -d '{"action":"merge","from":"<DUPLICATE_USER_ID>","to":"<CANONICAL_USER_ID>"}' | jq
```

The merge refuses unless both users exist and share the same email. If a
duplicate holds no data, deleting it (`action":"delete"`) is enough.

Backing RPCs (migration `20260812220000_merge_duplicate_auth_users.sql`,
`service_role` only): `admin_list_duplicate_auth_emails()`,
`admin_merge_user_records(p_from, p_to)`.

### 3. Retry

Re-run **Sign in with Navio** — the identity now links to the single remaining
user. No more `server_error`.

### Prevention

- Keep `email_verified: true` on both the product IdP (`navio:active`) and Google.
- Prefer SSO for employees; avoid creating password/invite accounts for an email
  that already has a Google/Navio login (that is what seeds duplicates).
- Periodically run `admin_list_duplicate_auth_emails()` (or the `?mode=duplicates`
  endpoint) as a health check.

## Related

- Forecast setup: `navio-forecast-dashboard/docs/sso/navio-core-auth-setup.md`
- Backend IdP: `noddi-backend-api/docs/developer/idp.md`
- Claims + shared helpers: `@navio/nidp`
- Infrastructure ADR: `noddi-infrastructure/docs/idp.md`
