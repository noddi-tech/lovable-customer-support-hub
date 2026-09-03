/// <reference types="vitest" />

import react from "@vitejs/plugin-react-swc"
import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_COMMIT__: JSON.stringify("test"),
    __APP_BUILD_TIME__: JSON.stringify("2024-01-01T00:00:00.000Z"),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "src/test/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
        "src/integrations/supabase/types.ts",
        "src/vite-env.d.ts",
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
