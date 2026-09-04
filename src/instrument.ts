/**
 * Sentry must initialize before the rest of the app boots.
 * Import this file first from main.tsx — keep this module free of the route tree
 * so early boot errors are captured before pages load.
 *
 * TanStack Router navigation/pageload tracing is attached in `src/router/router.tsx`
 * via `Sentry.addIntegration(Sentry.tanstackRouterBrowserTracingIntegration(router))`
 * (replaces the old React Router `reactRouterV6BrowserTracingIntegration`).
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/react/features/tanstack-router/
 */
import * as Sentry from "@sentry/react"

/** Public browser DSN (safe to ship); overridable per environment. */
const DEFAULT_SENTRY_DSN =
  "https://dc957f9ac5734901df820e05d57431ca@o4506178120646656.ingest.us.sentry.io/4512020718944256"

const dsn = import.meta.env.VITE_SENTRY_DSN || DEFAULT_SENTRY_DSN
const isProd = import.meta.env.PROD

/**
 * Sentry environment:
 * - "production"  → the published app on its real hosts (support.noddi.co, etc.)
 * - "preview"     → Lovable preview / staging builds (also PROD bundles)
 * - "development" → local dev
 */
function resolveEnvironment(): string {
  if (!isProd) return "development"
  const host = typeof window === "undefined" ? "" : window.location.hostname
  if (host.includes("id-preview") || host.endsWith(".lovableproject.com")) return "preview"
  return "production"
}

const environment = resolveEnvironment()

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment,
  release:
    typeof __APP_COMMIT__ !== "undefined" && __APP_COMMIT__ !== "unknown"
      ? `support-hub@${__APP_COMMIT__}`
      : undefined,

  dataCollection: {
    // Defaults collect useful context; tighten here if needed:
    // userInfo: false,
    // httpBodies: [],
  },

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  // Tracing — full in local/dev; lower volume in production
  tracesSampleRate: isProd ? 0.2 : 1.0,
  // Keep distributed tracing same-origin. Propagating Sentry's `sentry-trace`
  // and `baggage` headers to Supabase forces a CORS preflight; functions that
  // do not explicitly allow both headers then receive OPTIONS but never POST.
  tracePropagationTargets: ["localhost", /^\//],

  // Session Replay — sample continuously in prod; always capture around errors
  replaysSessionSampleRate: isProd ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  // Structured logs via Sentry.logger.* (metrics are enabled by default on recent SDKs)
  enableLogs: true,

  beforeSendLog: (log) => {
    if (isProd && (log.level === "debug" || log.level === "trace")) {
      return null
    }
    return log
  },
})
