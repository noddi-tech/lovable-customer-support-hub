

## Address Feedback: 5 Issues from Anders

### 1. Add PWA manifest for home screen bookmark icon

**Problem**: When bookmarking the app on a phone home screen, it shows a gray default icon instead of the Support Hub logo.

**Fix**: Add a `manifest.json` in `public/` with the app name, icons, and `display: "standalone"`. Reference it in `index.html`. Use the existing logo at `public/images/logo-support-hub.png` and also create sized icon references. No service worker needed -- just the manifest for installability.

**Files**:
- Create `public/manifest.json` with app name "Support Hub", icons pointing to the existing logo, theme color, `display: "standalone"`
- Update `index.html`: add `<link rel="manifest" href="/manifest.json">`, add `<meta name="apple-mobile-web-app-capable">`, add `<link rel="apple-touch-icon" href="/images/logo-support-hub.png">`

### 2. Fix login box scroll on magic link tab

**Problem**: The login card overflows on smaller screens, requiring scroll inside the card.

**Fix**: The card uses `max-h-[90vh]` and `overflow-y-auto` on CardContent. The magic link tab has excessive spacing. Reduce spacing and padding to fit without scrolling on most devices.

**File**: `src/pages/Auth.tsx`
- Reduce `space-y-3` to `space-y-2` in several places
- Reduce CardHeader padding
- Make the card `max-h-[95vh]` instead of `90vh`

### 3. Remember login for longer (days instead of hours)

**Problem**: `jwt_expiry = 3600` (1 hour) in `supabase/config.toml`. Sessions expire quickly.

**Fix**: This is a **Supabase dashboard setting**, not a local config change. The `config.toml` only applies to local dev. For production, the JWT expiry must be changed in the Supabase dashboard under Authentication > Settings. I'll note this for the user.

However, the refresh token handling is already in place via `AuthContext.refreshSession()`. The real issue may be that sessions aren't being refreshed proactively. We can ensure `supabase.auth.startAutoRefresh()` is called (Supabase JS v2 does this by default).

**Action**: Inform user to change JWT expiry in Supabase dashboard (Authentication > URL Configuration > JWT Expiry). Recommend setting to `604800` (7 days). Also update `config.toml` for local dev consistency.

### 4 & 5. Default timezone to browser settings (not UTC/AM-PM)

**Problem**: New users default to UTC and 12h (AM/PM) format. Should detect browser timezone and use appropriate format.

**Current code**: `useUserTimezone.ts` already auto-detects browser timezone and defaults `time_format` to `'12h'`. `TimezoneSettings.tsx` also auto-saves browser timezone on first load. The issue is that the **time format** defaults to `12h` regardless of locale. Norwegian users expect 24h format.

**Fix**: Detect the user's locale-preferred time format from the browser. If the browser locale uses 24h (like `nb-NO`, `de`, `fr`, etc.), default to `24h` instead of `12h`.

**Files**:
- `src/hooks/useUserTimezone.ts`: Change the auto-update fallback to detect 24h preference from browser locale
- `src/components/settings/TimezoneSettings.tsx`: Same logic when auto-saving for first-time users

Detection logic:
```ts
function detectTimeFormat(): '12h' | '24h' {
  const formatted = new Intl.DateTimeFormat(navigator.language, { hour: 'numeric' }).resolvedOptions();
  return formatted.hourCycle === 'h23' || formatted.hourCycle === 'h24' ? '24h' : '12h';
}
```

### Summary

| # | Issue | Fix | Files |
|---|-------|-----|-------|
| 1 | Home screen icon | Add `manifest.json` + apple-touch-icon meta tags | `public/manifest.json` (new), `index.html` |
| 2 | Login box scroll | Reduce spacing/padding in auth card | `src/pages/Auth.tsx` |
| 3 | Session expiry | Update `config.toml` for local dev + instruct user to change in Supabase dashboard | `supabase/config.toml` + user action |
| 4-5 | Timezone defaults | Auto-detect 24h format from browser locale | `src/hooks/useUserTimezone.ts`, `src/components/settings/TimezoneSettings.tsx` |

5 files modified/created. No new dependencies. No desktop behavior changes.

