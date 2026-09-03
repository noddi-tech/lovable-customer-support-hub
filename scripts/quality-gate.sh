#!/usr/bin/env sh
# Shared quality gate for humans, Husky hooks, and coding agents (incl. Lovable).
#
# Usage:
#   scripts/quality-gate.sh              # fix + verify (default)
#   scripts/quality-gate.sh --check-only # verify only (no writes)
#   scripts/quality-gate.sh --fix-only  # autofix only
#
# Env:
#   QUALITY_GATE_RESTAGE=1  After fix, re-stage previously staged paths (pre-commit)

set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"

MODE=fix-and-check
case "${1:-}" in
  --check-only) MODE=check-only ;;
  --fix-only) MODE=fix-only ;;
  --fix-and-check | "") MODE=fix-and-check ;;
  -h | --help)
    sed -n '1,20p' "$0"
    exit 0
    ;;
  *)
    echo "Unknown option: $1" >&2
    exit 2
    ;;
esac

run_fix() {
  echo "→ Autofix (Biome + ESLint --fix + Prettier Markdown)"
  bun run fix

  if [ "${QUALITY_GATE_RESTAGE:-0}" = "1" ]; then
    # Re-include autofixed files that were already staged for this commit.
    if [ -n "${STAGED_FILES:-}" ]; then
      echo "→ Re-staging autofixed paths that were already staged"
      printf '%s\n' "$STAGED_FILES" | while IFS= read -r f; do
        [ -n "$f" ] || continue
        if [ -e "$f" ]; then
          git add -- "$f"
        fi
      done
    fi
  fi
}

run_check() {
  echo "→ Format check (Biome + Prettier Markdown)"
  bun run format:check

  echo "→ Lint core (Biome + ESLint; warnings fail)"
  bun run lint:core

  echo "→ UI guardrails (tabs lint + long-labels)"
  bun run ui:guards
}

echo "🔍 Quality gate ($MODE)"

if [ "$MODE" = "fix-and-check" ] || [ "$MODE" = "fix-only" ]; then
  if [ "${QUALITY_GATE_RESTAGE:-0}" = "1" ] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR || true)
    export STAGED_FILES
  fi
  run_fix
fi

if [ "$MODE" = "fix-and-check" ] || [ "$MODE" = "check-only" ]; then
  run_check
fi

echo "✅ Quality gate passed"
