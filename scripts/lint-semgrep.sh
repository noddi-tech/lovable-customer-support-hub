#!/usr/bin/env sh
# Semgrep SAST. Fails on ERROR-severity findings only.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"

# Filter to ERROR rules via a tiny generated config (portable across Semgrep versions).
TMP_CONFIG=$(mktemp)
trap 'rm -f "$TMP_CONFIG"' EXIT
# Keep only severity: ERROR rules from .semgrep.yml (drop WARNING rules for gate).
awk '
  BEGIN { keep=0; buf="" }
  /^  - id:/ {
    if (keep && buf != "") print buf
    buf=$0 "\n"; keep=0; next
  }
  /^rules:/ { print; next }
  {
    buf=buf $0 "\n"
    if ($0 ~ /severity: ERROR/) keep=1
  }
  END { if (keep && buf != "") print buf }
' .semgrep.yml >"$TMP_CONFIG"

if command -v semgrep >/dev/null 2>&1; then
  echo "→ semgrep"
  semgrep --config "$TMP_CONFIG" --error src
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  echo "→ semgrep via docker"
  docker run --rm \
    -v "$ROOT:/src" \
    -v "$TMP_CONFIG:/tmp/semgrep-error.yml:ro" \
    returntocorp/semgrep \
    semgrep --config /tmp/semgrep-error.yml --error /src/src
  exit 0
fi

echo "⚠️  semgrep not installed (and docker unavailable) — skipping"
echo "   Install: brew install semgrep   OR   pipx install semgrep"
exit 0
