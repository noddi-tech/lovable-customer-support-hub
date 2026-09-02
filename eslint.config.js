/**
 * Hybrid lint setup: Biome owns formatting + most lint rules.
 * ESLint keeps only what Biome shouldn't replace here:
 *   1. eslint-plugin-react-hooks (exhaustive-deps edge cases)
 *   2. eslint-plugin-react-refresh (Vite HMR safety)
 *   3. Project-specific AST rule for SelectItem value={…user_id}
 */

import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "supabase/migrations/**",
      "supabase/functions/**",
      "src/data/**/*.generated.*",
      "src/integrations/supabase/types.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Pre-existing hooks debt is warn for now (same posture as Biome
      // useHookAtTopLevel). Tighten back to error once cleaned up.
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Domain rule: Prefer profiles.id (ProfileId) for assignment FKs.
      // user_id remains correct for auth tables (user_roles, memberships).
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
)
