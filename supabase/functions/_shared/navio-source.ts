/**
 * Identification headers sent on every request to the Noddi backend API.
 *
 * `X-Navio-Source` is always `support-hub`, `X-Navio-Source-Version` carries
 * the running app version. The version comes from the deployment env, or from
 * the calling browser (the Support Hub client sends `x-app-version` with its
 * build commit) when a request context is available.
 */

export const NAVIO_SOURCE = 'support-hub';

const ENV_VERSION =
  Deno.env.get('APP_VERSION') ||
  Deno.env.get('GIT_COMMIT') ||
  Deno.env.get('VITE_GIT_COMMIT') ||
  '';

let currentVersion = ENV_VERSION || 'unknown';

/** Picks up the caller's app version (`x-app-version`) when present. */
export function captureNavioSourceVersion(req: Request): void {
  const fromClient = req.headers.get('x-app-version')?.trim();
  if (fromClient) currentVersion = fromClient.slice(0, 64);
}

/** `X-Navio-Source` / `X-Navio-Source-Version` headers for Noddi API calls. */
export function navioSourceHeaders(): Record<string, string> {
  return {
    'X-Navio-Source': NAVIO_SOURCE,
    'X-Navio-Source-Version': currentVersion,
  };
}
