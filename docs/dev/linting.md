# Linting & code-quality tooling

Support Hub uses a layered quality stack. Prefer `make` targets; npm scripts are equivalent.

## Everyday (must pass before commit / push)

| Layer        | Command             | What it enforces                                             |
| ------------ | ------------------- | ------------------------------------------------------------ |
| Quality gate | `make quality-gate` | Autofix + format + Biome errors + ESLint + UI tab guards     |
| Pre-commit   | Husky `pre-commit`  | `lint-staged` → quality gate → **lint:strict** (all linters) |

```bash
make quality-gate          # fix + verify (hooks / agents)
make quality-gate-check    # verify only
make lint-all              # Biome + ESLint + tabs + pane
make lint-strict           # full suite (also runs on pre-commit)
```

Husky:

- **pre-commit** — `lint-staged` → `quality-gate --fix-and-check` → `npm run lint:strict`
- **pre-push** — full `quality-gate` (fix + check)

## Strict suite (CI / weekly hygiene)

```bash
make lint-strict
# or
npm run ci
```

| Tool                      | Command             | Purpose                                                                                                      |
| ------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Biome**                 | `make lint-biome`   | Format + lint (a11y, hooks, suspicious) — many rules are **error**                                           |
| **ESLint**                | `make lint-eslint`  | react-hooks, react-refresh, import-x, @eslint-react, type-aware promises, vitest, testing-library, storybook |
| **Knip**                  | `make lint-knip`    | Unused files, dependencies, and dead entry noise                                                             |
| **dependency-cruiser**    | `make lint-deps`    | No circular deps; widget ↛ admin/dashboard; no importing Deno edge sources from `src/`                       |
| **secretlint / gitleaks** | `make lint-secrets` | Credential leak prevention (`gitleaks` if installed, else `secretlint`)                                      |
| **jscpd**                 | `make lint-dupes`   | Copy-paste / clone detection                                                                                 |
| **Semgrep**               | `make lint-semgrep` | SAST patterns (`.semgrep.yml`); skips if Semgrep/Docker missing                                              |
| **npm audit**             | `make lint-audit`   | Dependency CVEs at high+                                                                                     |

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
3. **Quality gate stays fast** for local loops; **`lint:strict` / `npm run ci`** carries heavier architecture and security checks.
4. Prefer fixing findings over blanket ignores. When an ignore is required (sanitizer control-chars, nested interactive rows), put a one-line justification on the ignore.

## Optional installs (host tools)

```bash
brew install gitleaks semgrep   # or: pipx install semgrep
```

Without them, `lint:secrets` falls back to secretlint and `lint:semgrep` no-ops with a warning (exit 0).
