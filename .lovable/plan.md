

# Fix Broken Search: Top-Right Popover and Sidebar Input

## Root Cause

Two separate bugs, both caused by disconnected search flows:

### 1. Top-Right Search Popover (AppHeader)

**File**: `src/components/dashboard/AppHeader.tsx` (line 56)

The `handleSearch` function navigates to `/?search=...` which is the root/index route with a query param. This does NOT navigate to the `/search` page. The index route never reads a `search` query param, so nothing happens.

**Fix**: Change the navigation target from `/?search=...` to `/search?q=...` so it opens the dedicated search page with the query pre-filled. Then update `SearchPage.tsx` to read the initial `q` param from the URL.

### 2. Sidebar "Search conversations..." Input (EnhancedInteractionsLayout)

**File**: `src/components/dashboard/EnhancedInteractionsLayout.tsx` (lines 238-245)

The `handleSearchChange` calls `navigation.setSearch(value)` which sets `?q=` in the URL query params. However, the `ConversationListContext` (which actually filters conversations) uses its own internal `state.searchQuery`, only updated via `dispatch({ type: 'SET_SEARCH_QUERY', payload })`. The URL `?q=` param is never read by the ConversationListContext, so the filter is never applied.

**Fix**: Instead of routing through the navigation hook, dispatch `SET_SEARCH_QUERY` directly into the ConversationListContext. This requires the sidebar search to call the context's dispatch. Since `ConversationList` already wraps its children in a `ConversationListProvider`, the sidebar search input needs to be moved inside that provider, or the search needs to be passed as a prop to `ConversationList` which then dispatches internally.

## Detailed Changes

### File 1: `src/components/dashboard/AppHeader.tsx`

Update `handleSearch` to navigate to the search page:

```typescript
const handleSearch = (query: string) => {
  if (!query.trim()) return;
  navigate(`/search?q=${encodeURIComponent(query)}`);
  setSearchOpen(false);
  setSearchQuery('');
};
```

### File 2: `src/pages/SearchPage.tsx`

Read the initial `q` param from the URL so the search page pre-fills and runs the query:

- Import `useSearchParams` from react-router-dom
- On mount, read `searchParams.get('q')` and initialize both `query` and `debouncedQuery` with it

### File 3: `src/components/dashboard/EnhancedInteractionsLayout.tsx`

Update `handleSearchChange` to pass the search query as a prop to `ConversationList` instead of using the navigation hook's `setSearch`:

- Add a `searchQuery` prop to `ConversationList` (or pass it directly)
- Remove the `navigation.setSearch()` call from `handleSearchChange` (keep only local state)

### File 4: `src/components/dashboard/ConversationList.tsx`

Accept an optional `searchQuery` prop and sync it into the `ConversationListContext`:

- Add `searchQuery?: string` to props
- Inside the component (within the provider), use a `useEffect` to dispatch `SET_SEARCH_QUERY` whenever the prop changes

This keeps the search scoped to the current inbox because ConversationListContext already filters by `selectedInboxId`.

## Risk Assessment

- **Top-right search**: Changes only the navigation target URL. No existing functionality depends on `/?search=...`.
- **Sidebar search**: The `navigation.setSearch()` call was setting a URL param that nothing consumed, so removing it has no side effect. The new prop-based approach uses the existing, working filter logic in ConversationListContext.
- The `/search` page behavior is unchanged (it already works). Only the initial query from URL is added.

