

# Fix All Console Warnings

## Summary

Three categories of warnings found in the console. All fixes are additive or log-gating changes with zero risk of breaking functionality.

## 1. Missing i18n Translation Keys

**Problem**: 10 keys used in `ConversationListHeader.tsx` are missing from `en/common.json` (and other locale files), causing `[i18n MISSING]` warnings. They all have inline fallback strings so the UI works, but logs are noisy.

**Missing keys to add under `dashboard.conversationList`:**

| Key | Value (English) |
|---|---|
| `new` | `New` |
| `filters` | `Filters` |
| `filterConversations` | `Filter Conversations` |
| `markAllRead` | `Mark all read` |
| `sortLatest` | `Latest` |
| `sortOldest` | `Oldest` |
| `sortPriority` | `Priority` |
| `sortUnread` | `Unread First` |
| `activeFilters` | `Active filters:` |
| `clearAll` | `Clear all` |

**Files to update:**
- `src/locales/en/common.json` — add all 10 keys
- `src/locales/no/common.json` — add Norwegian translations
- `src/locales/de/common.json` — add German translations
- `src/locales/sv/common.json` — add Swedish translations
- `src/locales/da/common.json` — add Danish translations
- `src/locales/nl/common.json` — add Dutch translations
- `src/locales/fr/common.json` — add French translations
- `src/locales/es/common.json` — add Spanish translations
- `src/locales/it/common.json` — add Italian translations
- `src/locales/pt/common.json` — add Portuguese translations

**Risk**: None. Adding keys to JSON files cannot break anything.

## 2. Excessive AircallLoginModal Logging

**Problem**: `AircallLoginModal.tsx` has a `console.log('[AircallLoginModal] Render:', ...)` call at line 159 that fires on every render (8+ times on page load), even when the modal is closed. The `useEffect` debug log at line 44 also fires repeatedly.

**Fix**: Wrap both debug logs in `import.meta.env.DEV` checks so they only appear in development:

```typescript
// Line 159 - render log
if (import.meta.env.DEV) {
  console.log('[AircallLoginModal] Render:', { ... });
}

// Line 44 - state change log  
if (import.meta.env.DEV) {
  console.log('[AircallLoginModal] State changed:', { ... });
}
```

**File**: `src/components/dashboard/voice/AircallLoginModal.tsx`

**Risk**: None. Only suppresses debug logs in production. Modal functionality is unchanged.

## 3. Tailwind CDN Warning (No Action)

The `cdn.tailwindcss.com should not be used in production` warning comes from the embedded widget iframe, not the main application. This is expected behavior for the widget's self-contained bundle and is not actionable from the main codebase.

## Execution Order

All changes are independent and can be made in parallel:
1. Add missing i18n keys to all 10 locale files
2. Gate AircallLoginModal debug logs behind `import.meta.env.DEV`

