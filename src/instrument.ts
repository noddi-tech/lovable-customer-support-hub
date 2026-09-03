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

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
const isProd = import.meta.env.PROD
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ""

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: import.meta.env.MODE,
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
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/.*\.supabase\.co\/functions/,
    ...(supabaseUrl ? [supabaseUrl] : []),
  ],

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
