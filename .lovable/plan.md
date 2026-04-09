

# Add Pagination Footer to Conversation List

## What this does

Adds a compact footer bar at the bottom of the conversation list pane showing total count, page size selector, and page navigation — matching the style from the service tickets table. The pane scroll behavior is preserved.

## Current state

- The conversation list uses infinite scroll with 50-item pages fetched from Supabase
- `totalCount` is already available from `ConversationListContext`
- `filteredConversations` accumulates all loaded pages (no client-side pagination)
- Two table variants: `ConversationTable` (small lists) and `VirtualizedConversationTable` (large lists / infinite scroll)

## Approach

Since the conversation list currently loads all conversations via infinite scroll (not true client-side pagination), the footer will show:
- **Total count**: "Total of X item(s)" from `totalCount`
- **Page size selector**: Controls how many rows are visible per "page" (default 50) — this will add client-side pagination on top of the loaded data
- **Page controls**: "Page X of Y" with first/prev/next/last buttons

This means we add a client-side pagination layer: `filteredConversations` is sliced to show only the current page, while infinite scroll continues loading data in the background.

## Files to change

### 1. New: `src/components/dashboard/conversation-list/ConversationPaginationFooter.tsx`

A compact footer component matching the service tickets screenshot style:
- Left: "Total of {totalCount} item(s)"
- Right: Page size dropdown (10, 25, 50, 100), page indicator "Page X of Y", and `«` `‹` `›` `»` navigation buttons
- Styled as a sticky bottom bar with `shrink-0`, border-top, small text

### 2. `src/contexts/ConversationListContext.tsx`

Add pagination state to the reducer:
- `pageSize: number` (default 50)
- `currentPage: number` (default 1)
- Actions: `SET_PAGE_SIZE`, `SET_CURRENT_PAGE`
- Expose `paginatedConversations` (sliced from `filteredConversations`) alongside `filteredConversations`
- Reset `currentPage` to 1 when filters/search/sort change

### 3. `src/components/dashboard/conversation-list/ConversationTable.tsx`

- Use `paginatedConversations` instead of `filteredConversations` for rendering rows
- Keep using `filteredConversations.length` for "select all" scope

### 4. `src/components/dashboard/conversation-list/VirtualizedConversationTable.tsx`

- Use `paginatedConversations` for the virtualized list
- Adjust item count and infinite loader accordingly

### 5. `src/components/dashboard/ConversationList.tsx`

- Add `<ConversationPaginationFooter />` below the table area, inside the flex column but as a `shrink-0` element so it doesn't interfere with the scrollable pane above

## Layout structure (preserved scroll)

```text
┌─ ConversationList (flex col, h-full) ──────┐
│ [Header]                          shrink-0 │
│ [BulkActions]                     shrink-0 │
│ [FilterChips]                     shrink-0 │
│ ┌─ Table area ──────────────── flex-1 ───┐ │
│ │ (scrollable / virtualized)             │ │
│ └────────────────────────────────────────┘ │
│ [PaginationFooter]               shrink-0  │
│ [DeleteDialog / ArchiveDialog]             │
└────────────────────────────────────────────┘
```

