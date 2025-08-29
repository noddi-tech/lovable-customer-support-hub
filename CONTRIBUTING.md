# Contributing Guide

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## UI Guardrails

This project includes automated checks to prevent tabs/button overflow regressions:

### Pre-commit Hooks

Before each commit, the following checks run automatically:
- **Tabs linting**: Scans for unsafe tab/button patterns that could cause overflow
- **Long labels test**: Ensures tab components handle long text without horizontal scrollbars

### Fixing Guardrail Failures

If the pre-commit hook fails:

#### Tabs Linting Failures
The `npm run lint:tabs` command flags these anti-patterns:
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
The `npm run test:tabs` command ensures tabs wrap properly with long text.

**Fix by:**
- Ensuring `TabsList` has `flex-wrap` and `min-w-0`
- Ensuring `TabsTrigger` has `items-center gap-2 leading-none` (no `whitespace-nowrap`)
- Using proper responsive containers that don't force horizontal scroll

### Manual Testing

When modifying tabs/buttons, test these scenarios:
- Long tab labels (with icons + text)
- Narrow containers (≤360px width)  
- Multiple tab groups on same page
- Verify no horizontal scrollbars appear in tab bars

### Disabling Checks (Emergency)

If you need to bypass checks temporarily:
```bash
git commit --no-verify -m "emergency fix"
```

**Note:** This should only be used for urgent production fixes.