/**
 * Observability integration — Grafana Faro (RUM) + OpenPanel (product analytics).
 *
 * Thin wrapper around the shared @navio/observability SDK so the rest of the app
 * only imports from `@/integrations/observability`.
 *
 * Env (all browser-safe, non-secret):
 *   VITE_APP_OPENPANEL_CLIENT_ID  per-app OpenPanel project key
 *   VITE_APP_OPENPANEL_API_URL    first-party ingestion host, e.g. https://analytics.noddi.co/api
 *   VITE_APP_FARO_URL             Alloy Faro receiver endpoint (optional)
 *   VITE_APP_FARO_API_KEY         Faro x-api-key (optional)
 */
import { initFaro, OpenPanelShipper, tracking } from '@navio/observability';
import { ReactIntegration } from '@grafana/faro-react';

export { tracking } from '@navio/observability';
export type { EventProps, ShipperGroup, ShipperUser } from '@navio/observability';

export const APP_NAME = 'support-hub';

const env = import.meta.env;
const isProd = env.MODE === 'production';

let initialized = false;

export function initObservability(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  tracking.configure({
    onError: (error, ctx) => console.warn('[observability] shipper error', ctx, error),
  });

  // --- OpenPanel (product analytics + session replay) -----------------------
  const clientId = env.VITE_APP_OPENPANEL_CLIENT_ID as string | undefined;
  if (clientId) {
    tracking.registerShipper(
      new OpenPanelShipper({
        clientId,
        apiUrl: (env.VITE_APP_OPENPANEL_API_URL as string) || 'https://analytics.noddi.co/api',
        trackScreenViews: true,
        trackOutgoingLinks: true,
        // Ship real events unless explicitly disabled (VITE_APP_OPENPANEL_STUB=1).
        stub: env.VITE_APP_OPENPANEL_STUB === '1',
        sessionReplay: { enabled: true, sampleRate: 0.1 },
      })
    );
  }

  // --- Grafana Faro (RUM: errors, web vitals, traces) ----------------------
  const faroUrl = env.VITE_APP_FARO_URL as string | undefined;
  if (faroUrl) {
    initFaro({
      appName: APP_NAME,
      url: faroUrl,
      apiKey: env.VITE_APP_FARO_API_KEY as string | undefined,
      version: typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : undefined,
      environment: env.MODE,
      enabled: isProd,
      sessionSampleRate: isProd ? 0.2 : 1.0,
      instrumentations: [new ReactIntegration()],
      tracking,
    });
  }
}
