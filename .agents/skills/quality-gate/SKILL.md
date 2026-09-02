---
name: quality-gate
description: Enforce Support Hub pre-commit/pre-push quality gate (make fix then format-check + lint + ui-guards). Use before every commit or push, when finishing a change, or when Lovable/Grok/Claude/Cursor agents are about to commit.
---

# Quality gate (required before commit / push)

## When to use

Run this skill **before every `git commit` and every `git push`**, and whenever an agent (including Lovable) finishes a change set that will be committed.

## Required command

```bash
make quality-gate
```

Equivalents (same script Husky uses):

```bash
npm run quality:gate
sh scripts/quality-gate.sh --fix-and-check
```

### What it does

1. Autofix: Biome `--write`, ESLint `--fix`, Prettier on `*.md` / `*.mdx`
2. Verify: `format:check` → `lint` → `ui:guards`

### After it runs

- Stage rewritten files into the pending commit (`git add -u` for intended paths).
- Do not commit if the gate exits non-zero — fix failures, re-run the gate.
- Do not use `git commit --no-verify` or `git push --no-verify` unless the user explicitly requests a bypass.

### Check-only mode

```bash
make quality-gate-check
```

## Source of truth

- Script: `scripts/quality-gate.sh`
- Agent policy: `AGENTS.md`
- Hooks: `.husky/pre-commit`, `.husky/pre-push`
