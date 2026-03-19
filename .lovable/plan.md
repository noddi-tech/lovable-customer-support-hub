

## Problem

The dev server is loading Tailwind CSS v4 despite `tailwindcss` being pinned to `3.4.17` in devDependencies. This happens because `@tailwindcss/postcss@^4.2.2` (a v4 package) is still listed in dependencies and brings its own copy of Tailwind v4 into `node_modules`, which the dev server resolves first.

The error message — "The PostCSS plugin has moved to a separate package" — is Tailwind v4's way of saying the old `tailwindcss` PostCSS plugin entry point no longer works.

## Fix

1. **Remove `@tailwindcss/postcss`** from `package.json` dependencies — this v4 package is incompatible with the project's v3 setup and was added by mistake in an earlier fix attempt.

2. **Keep `postcss.config.js` as-is** — it correctly references `tailwindcss` (v3 style).

3. **Keep `tailwindcss: "3.4.17"` in devDependencies** — this is the correct version.

That single dependency removal should resolve the error.

