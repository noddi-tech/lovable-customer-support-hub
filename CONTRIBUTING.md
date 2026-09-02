# Contributing Guide

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install` (runs `husky` via `prepare`)
3. Start the development server: `npm run dev` / `make dev`

## Quality gate (required)

Before every commit and every push, run:

```bash
make quality-gate
```

This is the same gate wired into Husky and required for coding agents (see `AGENTS.md`):

1. **Autofix** — Biome + ESLint `--fix` + Prettier Markdown (`npm run fix`)
2. **Verify** — `format:check` + `lint` + `ui:guards`

Hooks:

- **pre-commit** — runs the gate and re-stages autofixed files that were already staged
- **pre-push** — runs the same gate

Manual equivalents:

```bash
npm run quality:gate
npm run precommit   # with restage
npm run prepush
make quality-gate-check   # verify only, no writes
```

## UI Guardrails

`ui:guards` (part of the quality gate) prevents tabs/button overflow regressions:

- **Tabs linting**: unsafe tab/button patterns that could cause overflow
- **Long labels test**: tab components must handle long text without horizontal scrollbars

### Fixing Guardrail Failures

#### Tabs Linting Failures

`npm run lint:tabs` flags:

- `overflow-x-auto` or `overflow-hidden` near `TabsList`
- `whitespace-nowrap` on `TabsTrigger` or buttons
- Missing `min-w-0` on flex containers with tabs
- `ScrollArea` wrapping tab headers

**Fix by:**

- Move `overflow-y-auto` to pane body only, not tab containers
- Use `flex flex-wrap min-w-0` on tab container parents
- Remove `whitespace-nowrap` from triggers
- Keep tabs outside `ScrollArea` components

#### Long Labels Test Failures

`npm run test:tabs` ensures tabs wrap properly with long text.

**Fix by:**

- Ensuring `TabsList` has `flex-wrap` and `min-w-0`
- Ensuring `TabsTrigger` has `items-center gap-2 leading-none` (no `whitespace-nowrap`)
- Using proper responsive containers that don't force horizontal scroll

### Manual Testing

When modifying tabs/buttons, test:

- Long tab labels (with icons + text)
- Narrow containers (≤360px width)
- Multiple tab groups on same page
- No horizontal scrollbars in tab bars

### Disabling Checks (Emergency)

```bash
git commit --no-verify -m "emergency fix"
git push --no-verify
```

Only for urgent production fixes. Agents must not bypass unless explicitly told to.
