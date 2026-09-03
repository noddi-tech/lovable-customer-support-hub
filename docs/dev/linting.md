# Linting & code-quality tooling

Support Hub uses a layered quality stack. Prefer `make` targets; `bun run` scripts are equivalent.

## Everyday (must pass before commit / push)

| Layer        | Command             | What it enforces                                                              |
| ------------ | ------------------- | ----------------------------------------------------------------------------- |
| Quality gate | `make quality-gate` | Autofix + format + Biome + ESLint core (warnings fail) + UI tab guards        |
| Lint (all)   | `make lint`         | Full linter suite (Biome, ESLint, tabs, pane, knip, deps, secrets, dupes, …)  |
| Pre-commit   | Husky `pre-commit`  | `lint-staged` → quality gate → **`make lint` / `bun run lint`** (all linters) |

```bash
make quality-gate          # fix + verify (hooks / agents; fast core lint)
make quality-gate-check    # verify only
make lint                  # all linters (also runs on pre-commit)
make lint-all              # Biome + ESLint + tabs + pane
make lint-core             # Biome + ESLint only
```

Husky:

- **pre-commit** — `lint-staged` → `quality-gate --fix-and-check` → `bun run lint`
- **pre-push** — full `quality-gate` (fix + check)

## Full suite (`make lint`)

```bash
make lint
# alias: make lint-strict
# or
bun run ci
```

| Tool                      | Command                             | Purpose                                                                                                      |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Biome**                 | `make lint-biome`                   | Format + lint (a11y, hooks, suspicious) — warnings and errors both fail                                      |
| **ESLint**                | `make lint-eslint`                  | react-hooks, react-refresh, import-x, @eslint-react, type-aware promises, vitest, testing-library, storybook |
| **tabs / pane**           | `make lint-tabs` / `make lint-pane` | Domain UI overflow and pane scroll guards                                                                    |
| **Knip**                  | `make lint-knip`                    | Unused files, dependencies, and dead entry noise                                                             |
| **dependency-cruiser**    | `make lint-deps`                    | No circular deps; widget ↛ admin/dashboard; no importing Deno edge sources from `src/`                       |
| **secretlint / gitleaks** | `make lint-secrets`                 | Credential leak prevention (`gitleaks` if installed, else `secretlint`)                                      |
| **jscpd**                 | `make lint-dupes`                   | Copy-paste / clone detection                                                                                 |
| **Semgrep**               | `make lint-semgrep`                 | SAST patterns (`.semgrep.yml`); skips if Semgrep/Docker missing                                              |
| **bun audit**             | `make lint-audit`                   | Dependency CVEs at high+                                                                                     |

## Config map

| File                                    | Tool                |
| --------------------------------------- | ------------------- |
| `biome.json`                            | Biome               |
| `eslint.config.js`                      | ESLint flat config  |
| `knip.json`                             | Knip                |
| `.dependency-cruiser.cjs`               | dependency-cruiser  |
| `.secretlintrc.json` / `.gitleaks.toml` | Secrets             |
| `.semgrep.yml`                          | Semgrep             |
| `.jscpd.json`                           | jscpd               |
| `package.json` → `lint-staged`          | Staged-file autofix |

## Design notes

1. **Biome is the default formatter/linter** for JS/TS/JSON. Prettier is Markdown-only.
2. **ESLint stays thin but sharp**: hooks correctness, HMR export safety, curated type-aware async rules, test/story plugins.
3. **Quality gate stays fast** (`lint:core`) for local loops; **`make lint` / `bun run ci`** carries the full architecture and security suite.
4. Prefer fixing findings over blanket ignores. When an ignore is required (sanitizer control-chars, nested interactive rows), put a one-line justification on the ignore.

## Optional installs (host tools)

```bash
brew install gitleaks semgrep   # or: pipx install semgrep
```

Without them, `lint:secrets` falls back to secretlint and `lint:semgrep` no-ops with a warning (exit 0).
