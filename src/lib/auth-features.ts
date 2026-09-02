/**
 * Auth surface feature flags.
 *
 * Identity for Support Hub comes from **Navio** (product IdP, `custom:navio`)
 * or **Google** (Noddi employees). Email/password + magic-link + dev login are
 * legacy paths, hidden by default to keep the login screen clean. Set
 * `VITE_PASSWORD_LOGIN=1` to re-expose them (e.g. break-glass / local dev).
 */
export function isPasswordLoginEnabled(): boolean {
  return import.meta.env.VITE_PASSWORD_LOGIN === "1"
}
