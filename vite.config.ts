import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite"
import { sentryVitePlugin } from "@sentry/vite-plugin"
import react from "@vitejs/plugin-react-swc"
import { execSync } from "child_process"
import { componentTagger } from "lovable-tagger"
import path from "path"
import { defineConfig, loadEnv } from "vite"

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
export default defineConfig(({ mode }) => {
  // Load all env keys (including non-VITE_) so SENTRY_* works from `.env` / CI.
  // `.env.sentry-build-plugin` is also read automatically by the Sentry plugin.
  const env = loadEnv(mode, process.cwd(), "")
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN
  const sentryOrg = env.SENTRY_ORG || process.env.SENTRY_ORG || "noddi"
  const sentryProject = env.SENTRY_PROJECT || process.env.SENTRY_PROJECT || "support-hub"
  const sentryUploadEnabled = Boolean(sentryAuthToken)
  const releaseName = `support-hub@${resolveGitCommit()}`

  return {
    define: {
      __APP_COMMIT__: JSON.stringify(resolveGitCommit()),
      __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    build: {
      // Hidden source maps: emitted for Sentry upload, not linked from the browser.
      sourcemap: sentryUploadEnabled ? "hidden" : false,
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mcpPlugin(),
      mode === "development" && componentTagger(),
      // Keep Sentry last so source maps include other plugin transforms.
      sentryUploadEnabled &&
        sentryVitePlugin({
          org: sentryOrg,
          project: sentryProject,
          authToken: sentryAuthToken,
          release: {
            name: releaseName,
          },
          sourcemaps: {
            filesToDeleteAfterUpload: ["./dist/**/*.map"],
          },
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
