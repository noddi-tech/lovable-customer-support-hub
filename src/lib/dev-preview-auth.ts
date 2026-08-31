/**
 * Dev-only "skip login" bypass for local/Lovable preview browsing.
 *
 * Purpose: let a developer browse the app shell (navigation, layouts, empty
 * states) without an IdP round-trip. It ONLY affects client-side route guards.
 * It does NOT create a Supabase session, so any data behind RLS stays empty —
 * this is a UI browsing aid, not an auth hole.
 *
 * Hard-gated on `import.meta.env.DEV`, so it is dead code in production builds.
 */

const STORAGE_KEY = 'dev:preview-auth-bypass';

/** True only in a dev build (vite dev server / Lovable preview). */
export function isDevPreview(): boolean {
  return import.meta.env.DEV === true;
}

/** True when the developer has explicitly enabled the bypass in this browser. */
export function isPreviewBypassEnabled(): boolean {
  if (!isDevPreview()) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function enablePreviewBypass(): void {
  if (!isDevPreview()) return;
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* storage unavailable — bypass simply stays off */
  }
}

export function disablePreviewBypass(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}

/**
 * Dev-only credentials for the one-click "Dev sign-in" button.
 * Set VITE_DEV_LOGIN_EMAIL / VITE_DEV_LOGIN_PASSWORD in your local .env
 * (never in a production build). Signing in with these produces a REAL
 * Supabase session — real JWT, real RLS scope for that user.
 */
export function getDevLoginCredentials(): { email: string; password: string } | null {
  if (!isDevPreview()) return null;
  const email = import.meta.env.VITE_DEV_LOGIN_EMAIL as string | undefined;
  const password = import.meta.env.VITE_DEV_LOGIN_PASSWORD as string | undefined;
  if (!email || !password) return null;
  return { email, password };
}
