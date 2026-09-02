import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite"
import react from "@vitejs/plugin-react-swc"
import { execSync } from "child_process"
import { componentTagger } from "lovable-tagger"
import path from "path"
import { defineConfig } from "vite"

function resolveGitCommit(): string {
  const fromEnv =
    process.env.VITE_GIT_COMMIT ||
    process.env.GIT_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA
  if (fromEnv) return fromEnv.slice(0, 12)
  try {
    return execSync("git rev-parse --short=12 HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim()
  } catch {
    return "unknown"
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_COMMIT__: JSON.stringify(resolveGitCommit()),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mcpPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))
