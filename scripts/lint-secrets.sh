#!/usr/bin/env sh
# Secret scanning: prefer gitleaks when installed, else secretlint (via bunx).
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"

if command -v gitleaks >/dev/null 2>&1; then
  echo "→ gitleaks (protect)"
  gitleaks protect --staged --config .gitleaks.toml --verbose
  exit 0
fi

echo "→ secretlint (gitleaks not on PATH)"
# Scan tracked source-ish paths; skip lockfiles and generated noise.
bunx secretlint \
  "src/**/*.{ts,tsx,js,jsx,json,env}" \
  "scripts/**/*.{ts,tsx,js,mjs,cjs,sh}" \
  "supabase/functions/**/*.{ts,js}" \
  ".env.example" \
  --secretlintignore .gitignore
