import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      // Warn when user_id is used as SelectItem value - should use profiles.id (ProfileId) instead
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXAttribute[name.name='value'][value.expression.property.name='user_id']",
          message: "Avoid using user_id for assignment values. Use profiles.id (ProfileId) instead for foreign key references like assigned_to_id."
        }
      ],
    },
  }
);
