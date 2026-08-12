#!/usr/bin/env bash
# Configure Supabase Custom OIDC provider "custom:navio" (Sign in with Navio)
# against the **product** IdP at https://auth.noddi.co/o (navio-core).
#
# Shared constants match @navio/zidp:
#   PRODUCT_OIDC_ISSUER = https://auth.noddi.co/o
#   scopes = openid, email, profile, navio:active
#
# Prerequisites:
#   - Product OidcClient registered (name=navio-support-hub) + GSM secret.
#   - SUPABASE_SERVICE_ROLE_KEY for project qgfaycwsangsqzpveoup
#   - gcloud auth with access to noddi-prod secrets.
#
# Usage:
#   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'
#   ./scripts/configure-navio-oidc.sh
#
# Optional env:
#   SUPABASE_URL          default https://qgfaycwsangsqzpveoup.supabase.co
#   GCP_PROJECT           default noddi-prod
#   PRODUCT_OIDC_SECRET   default navio_support_hub_oidc
#   DRY_RUN=1             print payload without calling Supabase

set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://qgfaycwsangsqzpveoup.supabase.co}"
GCP_PROJECT="${GCP_PROJECT:-noddi-prod}"
# Prefer product-plane secret; fall back to legacy Authentik secret name if set.
PRODUCT_OIDC_SECRET="${PRODUCT_OIDC_SECRET:-navio_support_hub_oidc}"
LEGACY_AUTHENTIK_SECRET="${LEGACY_AUTHENTIK_SECRET:-navio_support_hub_authentik_oidc}"

ISSUER="https://auth.noddi.co/o"
DISCOVERY_URL="${ISSUER}/.well-known/openid-configuration"
PROVIDER_ID="custom:navio"
PROVIDER_NAME="Navio"

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  cat >&2 <<'EOF'
ERROR: SUPABASE_SERVICE_ROLE_KEY is not set.

Get it from:
  https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/settings/api
  → Project API keys → service_role (secret)

Then:
  export SUPABASE_SERVICE_ROLE_KEY='…'
  ./scripts/configure-navio-oidc.sh
EOF
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI is required to read GSM OIDC secrets" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required" >&2
  exit 1
fi

fetch_secret() {
  local secret_id="$1"
  gcloud secrets versions access latest \
    --secret="${secret_id}" \
    --project="${GCP_PROJECT}" 2>/dev/null || true
}

echo "==> Fetching product OIDC client from GSM (${PRODUCT_OIDC_SECRET})"
OIDC_JSON="$(fetch_secret "${PRODUCT_OIDC_SECRET}")"
if [[ -z "${OIDC_JSON}" ]]; then
  echo "    ${PRODUCT_OIDC_SECRET} missing; trying legacy ${LEGACY_AUTHENTIK_SECRET}"
  OIDC_JSON="$(fetch_secret "${LEGACY_AUTHENTIK_SECRET}")"
fi
if [[ -z "${OIDC_JSON}" ]]; then
  cat >&2 <<EOF
ERROR: No GSM secret found for product OIDC client.

Register the client on navio-core, then store JSON in GSM:

  uv run manage.py upsert_product_oidc_client \\
    --client-id "\$CLIENT_ID" \\
    --client-secret "\$CLIENT_SECRET" \\
    --name navio-support-hub \\
    --display-name "Navio Support Hub" \\
    --redirect-uri https://qgfaycwsangsqzpveoup.supabase.co/auth/v1/callback

  # then create secret ${PRODUCT_OIDC_SECRET} with {client_id, client_secret}
EOF
  exit 1
fi

CLIENT_ID="$(echo "${OIDC_JSON}" | jq -r '.client_id')"
CLIENT_SECRET="$(echo "${OIDC_JSON}" | jq -r '.client_secret')"

if [[ -z "${CLIENT_ID}" || "${CLIENT_ID}" == "null" || -z "${CLIENT_SECRET}" || "${CLIENT_SECRET}" == "null" ]]; then
  echo "ERROR: GSM secret missing client_id/client_secret" >&2
  exit 1
fi

echo "    client_id=${CLIENT_ID}"
echo "==> Checking product IdP discovery (${DISCOVERY_URL})"
HTTP_CODE="$(curl -sS -o /tmp/navio-oidc-discovery.json -w '%{http_code}' "${DISCOVERY_URL}" || true)"
if [[ "${HTTP_CODE}" != "200" ]]; then
  echo "ERROR: discovery returned HTTP ${HTTP_CODE} for ${DISCOVERY_URL}" >&2
  echo "       Deploy backend with OIDC_ISSUER=https://auth.noddi.co/o and DNS for auth.noddi.co." >&2
  exit 1
fi
echo "    OK"

AUTH_API="${SUPABASE_URL%/}/auth/v1"
HEADERS=(
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}"
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
  -H "Content-Type: application/json"
)

echo "==> Listing existing custom providers"
LIST_RESP="$(curl -sS "${HEADERS[@]}" "${AUTH_API}/admin/custom-providers" || true)"
echo "${LIST_RESP}" | jq . 2>/dev/null || echo "${LIST_RESP}"

PAYLOAD="$(jq -n \
  --arg identifier "${PROVIDER_ID}" \
  --arg name "${PROVIDER_NAME}" \
  --arg client_id "${CLIENT_ID}" \
  --arg client_secret "${CLIENT_SECRET}" \
  --arg issuer "${ISSUER}" \
  --arg discovery_url "${DISCOVERY_URL}" \
  '{
    provider_type: "oidc",
    identifier: $identifier,
    name: $name,
    client_id: $client_id,
    client_secret: $client_secret,
    issuer: $issuer,
    discovery_url: $discovery_url,
    scopes: ["openid", "email", "profile", "navio:active"],
    enabled: true,
    email_optional: false,
    pkce_enabled: true
  }')"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "==> DRY_RUN payload (secret redacted):"
  echo "${PAYLOAD}" | jq 'del(.client_secret) | .client_secret = "***"'
  exit 0
fi

# If provider already exists, update credentials/scopes instead of failing.
EXISTING_CODE="$(curl -sS -o /tmp/navio-provider-get.json -w '%{http_code}' \
  "${HEADERS[@]}" \
  "${AUTH_API}/admin/custom-providers/${PROVIDER_ID}" || true)"

if [[ "${EXISTING_CODE}" == "200" ]]; then
  echo "==> Updating existing provider ${PROVIDER_ID}"
  RESP="$(curl -sS -X PUT \
    "${HEADERS[@]}" \
    "${AUTH_API}/admin/custom-providers/${PROVIDER_ID}" \
    -d "${PAYLOAD}")"
else
  echo "==> Creating provider ${PROVIDER_ID}"
  RESP="$(curl -sS -X POST \
    "${HEADERS[@]}" \
    "${AUTH_API}/admin/custom-providers" \
    -d "${PAYLOAD}")"
fi

echo "${RESP}" | jq . 2>/dev/null || echo "${RESP}"

echo "==> Smoke-test authorize redirect"
# Expect 302 to auth.noddi.co (product brand), not Authentik application path.
SMOKE_CODE="$(curl -sS -o /dev/null -w '%{http_code}' -D /tmp/navio-auth-headers.txt \
  "${SUPABASE_URL%/}/auth/v1/authorize?provider=custom:navio" || true)"
LOCATION="$(grep -i '^location:' /tmp/navio-auth-headers.txt | head -1 | tr -d '\r' || true)"
echo "    HTTP ${SMOKE_CODE} ${LOCATION}"
if echo "${LOCATION}" | grep -q 'auth\.noddi\.co'; then
  echo "==> OK: browser will land on product IdP (auth.noddi.co)"
elif echo "${LOCATION}" | grep -q 'application/o/navio-support-hub'; then
  echo "WARN: still pointing at Authentik application path; re-check issuer/scopes" >&2
else
  echo "WARN: unexpected redirect; check Supabase provider config" >&2
fi

echo "Done."
