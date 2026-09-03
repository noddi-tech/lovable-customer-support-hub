/**
 * Hybrid lint setup: Biome owns formatting + most lint rules.
 * ESLint covers what Biome shouldn't replace here:
 *   1. react-hooks (exhaustive-deps / rules-of-hooks)
 *   2. react-refresh (Vite HMR safety)
 *   3. Domain AST rule for SelectItem value={…user_id}
 *   4. Type-aware typescript-eslint (curated; warnings fail via --max-warnings=0)
 *   5. @eslint-react, import-x, vitest, testing-library, storybook
 *
 * Promote type-aware + testing-library rules from warn→error via
 * `bun run lint:eslint:typed` (ESLINT_TYPED_STRICT=1) when desired.
 */

import eslintReact from "@eslint-react/eslint-plugin"
import vitest from "@vitest/eslint-plugin"
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript"
import importX from "eslint-plugin-import-x"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import storybook from "eslint-plugin-storybook"
import testingLibrary from "eslint-plugin-testing-library"
import globals from "globals"
import tseslint from "typescript-eslint"

const typedStrict = process.env.ESLINT_TYPED_STRICT === "1"

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "storybook-static/**",
      "playwright-report/**",
      "test-results/**",
      ".jscpd-report/**",
      "supabase/migrations/**",
      "supabase/functions/**",
      "src/data/**/*.generated.*",
      "src/integrations/supabase/types.ts",
    ],
  },

  // Base app/source rules (fast path for quality gate)
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "import-x": importX,
      "@eslint-react": eslintReact,
    },
    settings: {
      "import-x/resolver-next": [
        createTypeScriptImportResolver({
          // Root solution tsconfig already references app/node configs
          project: "tsconfig.json",
          alwaysTryTypes: true,
        }),
      ],
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      "import-x/no-duplicates": "error",
      "import-x/no-useless-path-segments": "error",

      "@eslint-react/no-unstable-default-props": "warn",
      "@eslint-react/no-nested-component-definitions": "warn",
      "@eslint-react/dom-no-dangerously-set-innerhtml": "off",
      "@eslint-react/no-array-index-key": "off",

      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXAttribute[name.name='value'][value.expression.property.name='user_id']",
          message:
            "For assignment FKs (assigned_to_id), use profiles.id (ProfileId). For auth tables (user_roles, memberships), user_id is correct.",
        },
      ],
    },
  },

  // Type-aware pass for src — warn by default; ESLINT_TYPED_STRICT=1 → error
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**", "src/**/*.stories.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-floating-promises": typedStrict ? "error" : "warn",
      "@typescript-eslint/no-misused-promises": [
        typedStrict ? "error" : "warn",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/await-thenable": typedStrict ? "error" : "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-for-in-array": "error",
      "@typescript-eslint/require-await": "warn",
    },
  },

  // Vitest + Testing Library (warn while backlog clears; still visible in CI logs)
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.{test,spec}.{ts,tsx}", "src/test/**/*.{ts,tsx}"],
    plugins: {
      vitest,
      "testing-library": testingLibrary,
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
    rules: {
      ...Object.fromEntries(
        Object.entries(vitest.configs.recommended.rules || {}).map(([k, v]) => [
          k,
          typedStrict ? v : v === "error" ? "warn" : v,
        ]),
      ),
      ...Object.fromEntries(
        Object.entries(testingLibrary.configs["flat/react"].rules || {}).map(([k, v]) => [
          k,
          typedStrict
            ? v
            : Array.isArray(v) && v[0] === "error"
              ? ["warn", v[1]]
              : v === "error"
                ? "warn"
                : v,
        ]),
      ),
      "testing-library/render-result-naming-convention": "off",
      "react-refresh/only-export-components": "off",
    },
  },

  // Storybook
  ...storybook.configs["flat/recommended"].map((cfg) => ({
    ...cfg,
    rules: {
      ...(cfg.rules || {}),
      // Soften while storybook package imports are cleaned up
      // Off until @storybook/react-vite can be added without a full dependency upgrade.
      "storybook/no-renderer-packages": "off",
      "react-refresh/only-export-components": "off",
    },
  })),

  // Co-located non-component exports are intentional for these patterns.
  {
    files: [
      "src/components/ui/**",
      "src/test/**",
      "**/__tests__/**",
      "**/*test-utils*",
      "src/contexts/**",
      "**/*Context.tsx",
      "**/*Provider.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
)
