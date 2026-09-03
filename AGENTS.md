# Agent instructions (Grok / Claude / Cursor / Lovable / Codex)

This file is the source of truth for coding agents working in Support Hub — including Lovable.

## Mandatory quality gate (before every commit and every push)

Do **not** commit or push until the quality gate passes.

```bash
make quality-gate
# equivalent: bun run quality:gate
# equivalent: sh scripts/quality-gate.sh --fix-and-check
```

That gate:

1. **Autofix** — `bun run fix` (Biome write + ESLint `--fix` + Prettier Markdown)
2. **Verify** — `format:check` + `lint:core` + `ui:guards`

Husky:

- `.husky/pre-commit` → `lint-staged` → `quality-gate.sh --fix-and-check` → `bun run lint`
  (full suite: Biome, ESLint, tabs/pane, Knip, dependency-cruiser, secrets, jscpd, Semgrep, audit)
- `.husky/pre-push` → `scripts/quality-gate.sh --fix-and-check`

Full suite: `make lint` (alias: `make lint-strict`) — see `docs/dev/linting.md`.

Agents must run it themselves even when hooks might be skipped (Lovable remote commits, `--no-verify`, sandboxes without Husky).

### After autofix

Include any files the gate rewrote in the same commit. Prefer:

```bash
make quality-gate
git add -u
git status   # confirm only intended paths
```

### Check-only (CI / verify without writes)

```bash
make quality-gate-check
```

### Emergency bypass (humans only)

```bash
git commit --no-verify
git push --no-verify
```

Agents must not use `--no-verify` unless the user explicitly orders a bypass.

## Local commands cheat sheet

| Task                        | Command                  |
| --------------------------- | ------------------------ |
| Dev server                  | `make dev`               |
| Autofix                     | `make fix`               |
| Quality gate (fix + verify) | `make quality-gate`      |
| All linters                 | `make lint`              |
| Lint core (Biome + ESLint)  | `make lint-core`         |
| Format check                | `make format-check`      |
| Unit tests                  | `make test`              |
| Full local CI-ish           | `make check` / `make ci` |

See `Makefile` (`make help`) for the full list.
