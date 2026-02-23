
# Replace Header Search with Command Palette Overlay

## Problem

Clicking the search icon in the header navigates to `/search`, which unmounts the current page and remounts a new one -- feels like a full page refresh and loses all current context (selected conversation, scroll position, etc.).

## Solution

Replace the header's search popover + navigate pattern with a **command palette overlay** (using the already-installed `cmdk` library and existing `CommandDialog` component). Search results appear in a floating dialog on top of the current page -- no navigation, no refresh, no context loss.

## How It Works

1. User clicks the search icon (or presses Cmd+K) -- a `CommandDialog` opens as an overlay
2. User types their query -- results load inline via the existing `useGlobalSearch` hook (debounced)
3. User clicks a result -- dialog closes, navigates to that conversation/customer
4. The `/search` page remains available for users who navigate there directly (e.g., bookmarks)

## Changes

### 1. New Component: `src/components/search/SearchCommandPalette.tsx`

A self-contained command palette component that:
- Accepts `open` and `onOpenChange` props
- Uses `CommandDialog` (from `cmdk`) for the overlay UI
- Has a search input with 300ms debounce
- Shows results grouped by type (Conversations, Customers, Messages) using `CommandGroup`
- Each result is a `CommandItem` that navigates on click and closes the dialog
- Shows loading spinner, empty state, and result counts
- Reuses `useGlobalSearch` hook for data fetching (queries all 3 types in parallel)
- Limits to top 5 results per category with a "View all in Search" link that navigates to `/search?q=...`

### 2. Update: `src/components/dashboard/AppHeader.tsx`

- Remove the `Popover`-based search UI (lines 124-158)
- Remove `searchQuery` state
- Import and render `SearchCommandPalette` controlled by `searchOpen` state
- Keep the search icon button -- it now toggles the command palette
- Register Cmd+K keyboard shortcut in this component (move from SearchPage)

### 3. Keep: `src/pages/SearchPage.tsx`

- No changes -- the full search page stays as-is for deep searches, filters, and direct URL access
- The "View all" link in the command palette links here

## Technical Details

- The command palette fetches all 3 types simultaneously using 3 parallel `useGlobalSearch` calls (conversations, customers, messages) with a shared debounced query
- Results are capped at 5 per group in the overlay for speed
- `CommandDialog` handles focus trap, Escape to close, and accessibility automatically
- `useNavigate` is used for result selection (same-tab, preserves auth)
- Keyboard: Arrow keys navigate results, Enter selects, Escape closes

## Files Changed

| File | Action |
|---|---|
| `src/components/search/SearchCommandPalette.tsx` | **New** -- command palette overlay component |
| `src/components/dashboard/AppHeader.tsx` | **Edit** -- swap Popover for CommandPalette |
