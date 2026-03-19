

## Diagnosis

The root cause is simple: **`@tailwindcss/postcss` (a Tailwind v4 package) is still listed on line 51 of `package.json`**. When the build sandbox installs dependencies, it pulls in Tailwind v4 via this package, which conflicts with the v3 PostCSS plugin setup.

Previous removal attempts were either not applied or reverted. The fix is straightforward — no v4 upgrade needed.

**Upgrading to Tailwind v4 is NOT recommended** for this production app because:
- It would require rewriting `src/index.css` (1,634 lines of v3 syntax including `@tailwind` directives, `@apply` rules, and `@layer` blocks)
- The `tailwind.config.ts` would need to be converted to CSS-based configuration
- All `@tailwindcss/typography` and `tailwindcss-animate` plugin usage would need migration
- High risk of regressions across the entire UI — unacceptable for a 99.9% uptime requirement

## Plan

### Step 1: Remove `@tailwindcss/postcss` from `package.json`

Delete line 51 (`"@tailwindcss/postcss": "^4.2.2"`) from the dependencies block. This is the single change that will fix the build.

### Step 2: Verify configuration files are correct

- `postcss.config.js` — already correct (uses `tailwindcss` v3 plugin)
- `tailwind.config.ts` — already correct (v3 format)
- `tailwindcss: "3.4.17"` in devDependencies — already correct

No other files need changes.

