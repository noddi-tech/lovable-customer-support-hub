

# Fix Top-Right Search White Flash

## Root Cause

Two issues contribute to the white flash when using the header search:

1. **Missing `type="button"`** on the Search `<Button>` in `AppHeader.tsx` (line 150). The shadcn Button component renders a `<button>` element without an explicit `type`, which defaults to `type="submit"` in HTML. While there's no direct `<form>` ancestor in the current DOM, the Radix Popover portal placement can occasionally inherit form contexts from parent DOM structures, potentially triggering a full browser form submission (page reload) rather than a client-side SPA navigation.

2. **State clearing before navigation**: `handleSearch` calls `setSearchOpen(false)` and `setSearchQuery('')` before the `navigate()` call completes its render cycle. This causes an intermediate render where the popover unmounts and the current page re-renders briefly before the route transition fires, producing a visible flash.

3. **Missing i18n keys** for `dashboard.search.title`, `dashboard.search.placeholder`, and `dashboard.search.search` causing console warnings on every render of the popover.

## Changes

### File 1: `src/components/dashboard/AppHeader.tsx`

- Reorder `handleSearch`: call `navigate()` first, then defer popover close and state clearing
- Add `type="button"` to the Search Button to prevent any accidental form submission behavior
- Prevent default on Enter keypress as an extra safety measure

```typescript
const handleSearch = (query: string) => {
  if (!query.trim()) return;
  navigate(`/search?q=${encodeURIComponent(query)}`);
  // Defer cleanup so navigation commits first
  requestAnimationFrame(() => {
    setSearchOpen(false);
    setSearchQuery('');
  });
};
```

And on the Button:
```tsx
<Button
  type="button"
  className="w-full"
  size="sm"
  onClick={() => handleSearch(searchQuery)}
  disabled={!searchQuery.trim()}
>
```

And on the Input's onKeyDown:
```tsx
onKeyDown={(e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSearch(searchQuery);
  }
}}
```

### File 2: `src/locales/en/common.json` (and all other locale files)

Add the missing `dashboard.search` section:

```json
"search": {
  "title": "Search Conversations",
  "placeholder": "Search by customer, subject, or content...",
  "search": "Search"
}
```

This section needs to be added inside the `"dashboard"` object in all 10 locale files (en, no, de, sv, da, nl, fr, es, it, pt) with appropriate translations.

## Risk Assessment

- **`type="button"`**: Purely defensive, prevents accidental form submit. No functionality change.
- **`e.preventDefault()`**: Only fires on Enter inside the search input. Prevents any default button/form behavior while still calling handleSearch.
- **`requestAnimationFrame` for cleanup**: The navigate fires immediately (SPA navigation), then the popover closes on the next frame. This eliminates the intermediate blank render. No logic change.
- **i18n keys**: Additive only. Replaces fallback strings with identical values from locale files.

