

# Fix: Search Button Causing Page Navigation/Refresh

## Problem

Clicking the search icon in the top-right header and submitting a query navigates to `/search?q=...`, which unmounts the current `/interactions/...` page entirely. The user experiences this as a "page refresh" -- they lose their current inbox context and conversation state.

## Fix

**File: `src/components/dashboard/AppHeader.tsx`**

Change the `handleSearch` function to open the search page **in a new browser tab** or, better yet, use the search popover only as a quick inline preview and keep the navigation as an explicit user choice.

The simplest and cleanest fix: make the search button navigate using `window.open` or `navigate` but with state preservation. However, the real issue is the user doesn't want to leave their current page.

**Recommended approach:** Keep the search popover for entering the query, but open the `/search` page in a way that doesn't disrupt the current view. Two options:

### Option A -- Open search results in a new tab (minimal change)

Update `handleSearch` in `AppHeader.tsx` (line 52-58):

```tsx
const handleSearch = (query: string) => {
  if (!query.trim()) return;
  window.open(`/search?q=${encodeURIComponent(query)}`, '_blank');
  setSearchOpen(false);
  setSearchQuery('');
};
```

This opens the search page in a new tab, keeping the current interactions page intact.

### Option B -- Navigate but preserve inbox context (alternative)

If same-tab navigation is preferred, preserve the inbox param so the user can easily return:

```tsx
const handleSearch = (query: string) => {
  if (!query.trim()) return;
  const currentInbox = new URLSearchParams(window.location.search).get('inbox');
  navigate(`/search?q=${encodeURIComponent(query)}${currentInbox ? `&returnInbox=${currentInbox}` : ''}`);
  requestAnimationFrame(() => {
    setSearchOpen(false);
    setSearchQuery('');
  });
};
```

**I recommend Option A** -- opening in a new tab is the standard UX pattern for global search that shouldn't disrupt the user's workflow.

## Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/AppHeader.tsx` | Update `handleSearch` to use `window.open` instead of `navigate` (1 line change) |

