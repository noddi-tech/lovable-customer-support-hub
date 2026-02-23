
# Clean Up Header and Table Separation

## Problem

The conversation list header has a grey background (`bg-card/80 backdrop-blur-sm shadow-surface`) that looks heavy and clashes with the table header row below it. There is no clear visual separation between the toolbar buttons and the table columns — they run together.

## Reference

Screenshot 2 shows the desired look: a clean white background for the toolbar area, with a thin border line separating the action buttons/filters from the sortable table column headers below.

## Changes

### 1. ConversationListHeader.tsx (line 80)

Remove the grey background and shadow from the header container:

**Before:** `bg-card/80 backdrop-blur-sm shadow-surface`
**After:** `bg-background` (clean, matches the page background)

Also increase padding slightly for breathing room: `p-2 md:p-3` instead of `p-1 md:p-1.5`.

### 2. ConversationTable.tsx (line 71)

Remove `bg-background` from the sticky table header since it no longer needs to contrast with a grey toolbar above. Keep the `border-b` for the line below the column headers.

### 3. VirtualizedConversationTable.tsx (line 156)

Same change — the fixed table header wrapper (`<div className="border-b bg-background">`) is fine as-is since it just needs the border line. No change needed here.

## Summary of visual result

- Toolbar area: clean white/transparent background, no shadow
- A thin `border-b` line separates the toolbar from the table column headers
- Table column headers: clean white background with their own `border-b` below
- Matches the reference screenshot's minimal, professional look

## Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/conversation-list/ConversationListHeader.tsx` | Remove grey bg, shadow; use `bg-background` and slightly more padding |
| `src/components/dashboard/conversation-list/ConversationTable.tsx` | No change needed (already has `border-b`) |
| `src/components/dashboard/conversation-list/VirtualizedConversationTable.tsx` | No change needed (already has `border-b`) |
