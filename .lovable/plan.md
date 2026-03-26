

## Fix: Google OAuth Login Race Condition on support.noddi.co

### Root Cause

After Google OAuth completes, Supabase redirects to `https://support.noddi.co/#access_token=...` (the `redirectTo` is set to `window.location.origin + '/'`).

The problem is on the `/` route in `App.tsx`:

```
<Route path="/" element={<Navigate to="/interactions/text" replace />} />
```

This `<Navigate>` fires during the first render -- **before** the AuthContext's `useEffect` can read and process the hash tokens. The hash gets stripped from the URL. Then:

1. AuthContext's `handleOAuthCallback()` checks `window.location.hash` → no tokens found
2. `getSession()` returns null because `_initialize()` hasn't completed the async exchange yet
3. `loading` becomes `false`, `user` is `null`
4. `ProtectedRoute` redirects to `/auth`
5. Meanwhile, Supabase's internal `_initialize()` finishes and fires `SIGNED_IN`
6. User may briefly see the login page, or end up in a redirect loop

This matches the console log showing `SIGNED_IN` with `isProcessingOAuth: false` -- the AuthContext never detected the OAuth callback because the hash was already gone.

### Fix

Change `redirectTo` in `handleGoogleSignIn` (and magic link) to point to `/auth` instead of `/`. The Auth page has explicit hash-detection code that waits for AuthContext to process tokens before redirecting.

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Change `redirectTo` from `window.location.origin + '/'` to `window.location.origin + '/auth'` in `handleGoogleSignIn` and `handleMagicLink` |

### What this fixes

- After Google auth, user lands on `https://support.noddi.co/auth#access_token=...`
- Auth page's `useEffect` sees hash tokens and skips the user-redirect check (line 93-96)
- AuthContext's `handleOAuthCallback` detects the hash and processes tokens
- Once `user` is set, Auth page's redirect kicks in and navigates to `/`
- Clean, sequential flow with no race condition

