# Contributing to Support Hub

Getting started as a new developer on Support Hub. Follow this guide for access,
local setup, day-to-day commands, and the quality gate required before every
commit and push.

## Access

Make sure you have:

- A Noddi email (e.g. `name@noddi.no`)
- Access to [Slack](https://realnoddi.slack.com/)
- Access to [GitHub](https://github.com/noddi-tech) with write access to this repo
- Credentials for the Supabase project (ask another developer)
- Navio / SSO access if you need to sign in against the real IdP (see
  [`docs/sso/navio-auth-setup.md`](./docs/sso/navio-auth-setup.md))

## Prerequisites

- **Node.js** and **npm** — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **Make** (optional but recommended — all common tasks have `make` targets)
- **Supabase CLI** — only needed if you run the local Supabase stack
  (`make supabase-start` / `make up`)
- **Docker** — required by the local Supabase stack

## Local setup

```bash
# 1. Clone
git clone <YOUR_GIT_URL>
cd support-hub

# 2. Install deps + create .env from .env.example if missing
make setup
# equivalent: npm ci --legacy-peer-deps && cp .env.example .env

# 3. Fill in Supabase values in .env (see .env.example)
#    Ask another developer for project secrets.

# 4. Start the Vite dev server
make dev
# equivalent: npm run dev
```

The app serves at **http://localhost:5173** by default.

### Optional: local Supabase + Vite together

```bash
make up      # Start local Supabase + Vite in the background
make down    # Stop both
```

### Environment variables

Copy [`.env.example`](./.env.example) to `.env`. Important keys:

| Variable                                           | Purpose                                                                             |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                                | Supabase project URL                                                                |
| `VITE_SUPABASE_PUBLISHABLE_KEY`                    | Browser-safe Supabase anon/publishable key                                          |
| `VITE_SUPABASE_PROJECT_ID`                         | Supabase project id                                                                 |
| `VITE_UI_PROBE`                                    | Set `1` to enable UI overlap probes                                                 |
| `VITE_LOG_LEVEL`                                   | `DEBUG` / `INFO` / `WARN` / `ERROR` / `SILENT`                                      |
| `VITE_DEV_LOGIN_EMAIL` / `VITE_DEV_LOGIN_PASSWORD` | Dev-only one-click sign-in on `/auth` (local / preview only — never in prod builds) |
| `VITE_QUOTED_SEGMENTATION`                         | Set `1` to enable quoted email segmentation                                         |

### Editing via Lovable

This repo is also editable through
[Lovable](https://lovable.dev/projects/85bad663-82f6-4abe-b065-809b79462500).
Changes made in Lovable are committed automatically; pushes from your IDE are
reflected there as well.

### Editing via GitHub Codespaces / web UI

You can also edit files directly in GitHub or launch a Codespace from the green
**Code** button. Prefer a local checkout for the quality gate and Supabase
workflows.

## Day-to-day commands

| Task                             | Command                                             |
| -------------------------------- | --------------------------------------------------- |
| Dev server                       | `make dev`                                          |
| Install deps                     | `make install` / `make setup`                       |
| Autofix                          | `make fix`                                          |
| Quality gate (fix + verify)      | `make quality-gate`                                 |
| Verify only (no writes)          | `make quality-gate-check`                           |
| Lint                             | `make lint`                                         |
| Format check                     | `make format-check`                                 |
| Typecheck                        | `make typecheck`                                    |
| Unit tests                       | `make test`                                         |
| UI guardrails                    | `make ui-guards`                                    |
| E2E (Playwright)                 | `make e2e`                                          |
| Full local CI-ish                | `make check` / `make ci`                            |
| Local Supabase                   | `make supabase-start` / `stop` / `status` / `reset` |
| Generate OpenAPI + edge manifest | `make generate`                                     |

See `make help` for the full list.

## Quality gate (required)

Before every commit and every push, run:

```bash
make quality-gate
# equivalent: npm run quality:gate
# equivalent: sh scripts/quality-gate.sh --fix-and-check
```

That gate:

1. **Autofix** — Biome write + ESLint `--fix` + Prettier Markdown (`npm run fix`)
2. **Verify** — `format:check` + `lint` + `ui:guards`

Husky runs the same script:

- **pre-commit** — `QUALITY_GATE_RESTAGE=1 scripts/quality-gate.sh --fix-and-check`
  (re-stages autofixed files that were already staged)
- **pre-push** — `scripts/quality-gate.sh --fix-and-check`

Coding agents must run the gate themselves even when hooks might be skipped
(Lovable remote commits, `--no-verify`, sandboxes without Husky). See
[`AGENTS.md`](./AGENTS.md).

### After autofix

Include any files the gate rewrote in the same commit:

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

Only for urgent production fixes. Agents must not bypass unless explicitly told to.

## UI guardrails

`ui:guards` (part of the quality gate) prevents tabs/button overflow regressions:

- **Tabs linting** — unsafe tab/button patterns that could cause overflow
- **Long labels test** — tab components must handle long text without horizontal scrollbars

### Fixing guardrail failures

#### Tabs linting (`npm run lint:tabs` / `make lint-tabs`)

Flags:

- `overflow-x-auto` or `overflow-hidden` near `TabsList`
- `whitespace-nowrap` on `TabsTrigger` or buttons
- Missing `min-w-0` on flex containers with tabs
- `ScrollArea` wrapping tab headers

**Fix by:**

- Move `overflow-y-auto` to pane body only, not tab containers
- Use `flex flex-wrap min-w-0` on tab container parents
- Remove `whitespace-nowrap` from triggers
- Keep tabs outside `ScrollArea` components

#### Long labels test (`npm run test:tabs` / `make test-ui`)

Ensures tabs wrap properly with long text.

**Fix by:**

- Ensuring `TabsList` has `flex-wrap` and `min-w-0`
- Ensuring `TabsTrigger` has `items-center gap-2 leading-none` (no `whitespace-nowrap`)
- Using responsive containers that do not force horizontal scroll

### Manual testing for tabs/buttons

When modifying tabs/buttons, test:

- Long tab labels (with icons + text)
- Narrow containers (≤360px width)
- Multiple tab groups on the same page
- No horizontal scrollbars in tab bars

### Dev utilities

```bash
# UI overlap probes (outlines offending elements in red)
VITE_UI_PROBE=1 npm run dev

# Log verbosity
VITE_LOG_LEVEL=DEBUG npm run dev   # all logs
VITE_LOG_LEVEL=INFO npm run dev    # default in development
VITE_LOG_LEVEL=WARN npm run dev    # quieter (good before commit)
VITE_LOG_LEVEL=SILENT npm run dev  # no logs
```

Deeper guides:

- [Debugging tools](./docs/dev/debugging.md) — UIProbe, SafeTabsWrapper, SafeToolbar
- [Logging system](./docs/dev/logging.md) — levels, deduplication, `logger` usage

## Documentation

In-app docs for signed-in users live at `/docs`. Source markdown is under
[`docs/`](./docs/README.md). Architecture Decision Records are in
[`docs/adr/`](./docs/adr/README.md).

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres, Realtime, Edge Functions)
- Biome + ESLint + Prettier (Markdown)
- Vitest + Playwright
- Husky quality gate on commit/push
