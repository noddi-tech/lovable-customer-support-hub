#!/usr/bin/env bash
# Configure Supabase Custom OIDC provider "custom:navio" (Sign in with Navio).
#
# Forecast used a one-time Dashboard click; this script does the same via the
# GoTrue Admin API so Support Hub can be wired from the CLI.
#
# Prerequisites:
#   - Authentik app already applied (GSM secret exists).
#   - SUPABASE_SERVICE_ROLE_KEY for project qgfaycwsangsqzpveoup
#     (Supabase Dashboard → Project Settings → API → service_role).
#   - gcloud auth with access to noddi-prod secrets.
#
# Usage:
#   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'
#   ./scripts/configure-navio-oidc.sh
#
# Optional env:
#   SUPABASE_URL          default https://qgfaycwsangsqzpveoup.supabase.co
#   GCP_PROJECT           default noddi-prod
#   AUTHENTIK_OIDC_SECRET default navio_support_hub_authentik_oidc
#   DRY_RUN=1             print payload without calling Supabase

set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://qgfaycwsangsqzpveoup.supabase.co}"
GCP_PROJECT="${GCP_PROJECT:-noddi-prod}"
AUTHENTIK_OIDC_SECRET="${AUTHENTIK_OIDC_SECRET:-navio_support_hub_authentik_oidc}"

ISSUER="https://auth.noddi.co/application/o/navio-support-hub/"
DISCOVERY_URL="${ISSUER}.well-known/openid-configuration"
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
  echo "ERROR: gcloud CLI is required to read ${AUTHENTIK_OIDC_SECRET}" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required" >&2
  exit 1
fi

echo "==> Fetching Authentik OIDC client from GSM (${AUTHENTIK_OIDC_SECRET})"
OIDC_JSON="$(gcloud secrets versions access latest \
  --secret="${AUTHENTIK_OIDC_SECRET}" \
  --project="${GCP_PROJECT}")"
CLIENT_ID="$(echo "${OIDC_JSON}" | jq -r '.client_id')"
CLIENT_SECRET="$(echo "${OIDC_JSON}" | jq -r '.client_secret')"

if [[ -z "${CLIENT_ID}" || "${CLIENT_ID}" == "null" || -z "${CLIENT_SECRET}" || "${CLIENT_SECRET}" == "null" ]]; then
  echo "ERROR: GSM secret missing client_id/client_secret" >&2
  exit 1
fi

echo "    client_id=${CLIENT_ID}"
echo "==> Checking Authentik discovery"
HTTP_CODE="$(curl -sS -o /tmp/navio-oidc-discovery.json -w '%{http_code}' "${DISCOVERY_URL}")"
if [[ "${HTTP_CODE}" != "200" ]]; then
  echo "ERROR: discovery returned HTTP ${HTTP_CODE} for ${DISCOVERY_URL}" >&2
  echo "       Apply authentik_config first (make tf_apply_authentik_config_prod)." >&2
  exit 1
fi
echo "    OK (${DISCOVERY_URL})"

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
    scopes: ["openid", "email", "profile", "zendos:active"],
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
  "${AUTH_API}/admin/custom-providers/${PROVIDER_ID}")"

if [[ "${EXISTING_CODE}" == "200" ]]; then
  echo "==> Provider ${PROVIDER_ID} exists — updating"
  # identifier + provider_type are immutable on update
  UPDATE_PAYLOAD="$(echo "${PAYLOAD}" | jq 'del(.identifier, .provider_type)')"
  RESP="$(curl -sS -w '\n%{http_code}' "${HEADERS[@]}" \
    -X PUT \
    -d "${UPDATE_PAYLOAD}" \
    "${AUTH_API}/admin/custom-providers/${PROVIDER_ID}")"
else
  echo "==> Creating provider ${PROVIDER_ID}"
  RESP="$(curl -sS -w '\n%{http_code}' "${HEADERS[@]}" \
    -X POST \
    -d "${PAYLOAD}" \
    "${AUTH_API}/admin/custom-providers")"
fi

BODY="$(echo "${RESP}" | sed '$d')"
CODE="$(echo "${RESP}" | tail -n1)"
echo "${BODY}" | jq . 2>/dev/null || echo "${BODY}"
echo "    HTTP ${CODE}"

if [[ "${CODE}" != "200" && "${CODE}" != "201" ]]; then
  echo "ERROR: Supabase rejected provider configuration (HTTP ${CODE})" >&2
  exit 1
fi

echo "==> Smoke test authorize endpoint"
SMOKE="$(curl -sS -o /tmp/navio-authz-body.txt -w '%{http_code}' \
  -D /tmp/navio-authz.hdrs \
  "${AUTH_API}/authorize?provider=${PROVIDER_ID}")"
echo "    HTTP ${SMOKE}"
if grep -qi '^location:.*auth.noddi.co' /tmp/navio-authz.hdrs 2>/dev/null; then
  echo "    OK — redirects to auth.noddi.co"
elif [[ "${SMOKE}" == "302" || "${SMOKE}" == "303" ]]; then
  echo "    Redirect Location:"
  grep -i '^location:' /tmp/navio-authz.hdrs || true
else
  echo "    Body:"
  head -c 400 /tmp/navio-authz-body.txt; echo
  echo "WARNING: expected 302 to auth.noddi.co; provider may still need dashboard enablement." >&2
fi

echo
echo "Done. Sign in with Navio should work after a hard refresh of the Lovable preview."
echo "Callback (already on Authentik): ${SUPABASE_URL%/}/auth/v1/callback"
