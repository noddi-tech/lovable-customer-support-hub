/**
 * Observability integration — Grafana Faro (RUM) + OpenPanel (product analytics).
 *
 * Thin wrapper around the shared @navio/observability SDK so the rest of the app
 * only imports from `@/integrations/observability`.
 *
 * Error monitoring / tracing / session replay live in `src/instrument.ts` (Sentry).
 *
 * Faro auth uses the non-secret `x-api-key` app key (`alloy_faro_app_key` in GSM)
 * via the Alloy/ztrapi auth proxy; CORS on `support.noddi.co` (and related noddi
 * hosts) is the real origin gate.
 *
 * Env (all browser-safe, non-secret):
 *   VITE_APP_OPENPANEL_CLIENT_ID  per-app OpenPanel project key
 *   VITE_APP_OPENPANEL_API_URL    first-party ingestion host, e.g. https://analytics.noddi.co/api
 *   VITE_APP_OPENPANEL_STUB       set to 1 to log OpenPanel events instead of shipping
 *   VITE_APP_FARO_URL             Alloy Faro receiver (default https://telemetry.noddi.co)
 *   VITE_APP_FARO_API_KEY         Faro x-api-key from GSM `alloy_faro_app_key`
 *   VITE_SENTRY_DSN               Sentry browser DSN (optional; empty disables Sentry)
 */

import { ReactIntegration } from "@grafana/faro-react"
import { initFaro, OpenPanelShipper, tracking } from "@navio/observability"

export type { EventProps, ShipperGroup, ShipperUser } from "@navio/observability"
export { tracking } from "@navio/observability"

export const APP_NAME = "support-hub"

const env = import.meta.env
const isProd = env.MODE === "production"

const OPENPANEL_CLIENT_ID = env.VITE_APP_OPENPANEL_CLIENT_ID as string | undefined
const OPENPANEL_API_URL =
  (env.VITE_APP_OPENPANEL_API_URL as string | undefined) || "https://analytics.noddi.co/api"

/** First-party Faro collector (same-site for support.noddi.co — ad-blocker friendly). */
const FARO_URL = (env.VITE_APP_FARO_URL as string | undefined) || "https://telemetry.noddi.co"
const FARO_API_KEY = env.VITE_APP_FARO_API_KEY as string | undefined

let initialized = false

export function initObservability(): void {
  if (initialized || typeof window === "undefined") return
  initialized = true

  tracking.configure({
    onError: (error, ctx) => console.warn("[observability] shipper error", ctx, error),
  })

  // --- OpenPanel (product analytics + session replay) -----------------------
  if (OPENPANEL_CLIENT_ID) {
    tracking.registerShipper(
      new OpenPanelShipper({
        clientId: OPENPANEL_CLIENT_ID,
        apiUrl: OPENPANEL_API_URL,
        trackScreenViews: true,
        trackOutgoingLinks: true,
        // Ship real events unless explicitly disabled (VITE_APP_OPENPANEL_STUB=1).
        stub: env.VITE_APP_OPENPANEL_STUB === "1",
        sessionReplay: {
          enabled: true,
          sampleRate: 0.1,
          // Keep text readable in replays (inputs stay masked).
          maskAllText: false,
          maskAllInputs: true,
        },
      }),
    )
  }

  // --- Grafana Faro (RUM: errors, web vitals, traces) ----------------------
  // Requires the Alloy Faro app key (x-api-key). URL defaults to the first-party
  // collector so support.noddi.co stays same-site for ad blockers.
  if (FARO_API_KEY) {
    initFaro({
      appName: APP_NAME,
      url: FARO_URL,
      apiKey: FARO_API_KEY,
      version: typeof __APP_COMMIT__ !== "undefined" ? __APP_COMMIT__ : undefined,
      environment: env.MODE,
      enabled: isProd,
      sessionSampleRate: isProd ? 0.2 : 1.0,
      instrumentations: [new ReactIntegration()],
      tracking,
    })
  }
}
