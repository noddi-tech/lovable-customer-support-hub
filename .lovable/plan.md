

# World-Class Toolbar UI Cleanup

## Current Problems (from screenshot)

1. **Two-row layout wastes vertical space** -- Select sits alone on the left, other actions cluster on the right, and Sort floats on a separate row below
2. **Buttons are too tall** (h-7 = 28px) for a dense toolbar -- feels clunky
3. **Sort dropdown is orphaned** on its own row with no label, looks disconnected
4. **Sync button** still visible in top header despite being unused
5. **Visual hierarchy is unclear** -- primary action (+New) doesn't stand out enough from utility actions (Merge, Migrate)

## Design Approach

A single compact toolbar row, inspired by tools like Linear and Intercom:

```text
[ Select ] [ + New ] [ Filters v ] [ Merge ] [ Migrate ] [ Mark all read ]  ----  [ Sort: Latest v ]
```

Key principles:
- **Single row** with flex-wrap for small screens
- **h-6 (24px) buttons** -- compact, professional density
- **Primary action (+New)** keeps `variant="default"` to stand out
- **Utility actions** (Select, Merge, Migrate, Mark all read) use `variant="ghost"` to reduce visual noise
- **Filters** keeps `variant="outline"` (or `default` when active) since it's frequently used
- **Sort dropdown** moves to the right end of the same row with a "Sort:" prefix label
- **Reduced padding** on the container (p-1.5 instead of p-2/p-3)
- **Active filter badges** remain as a conditional second row (unchanged)

## Changes

### 1. Remove SyncButton from AppHeader

**File**: `src/components/dashboard/AppHeader.tsx`
- Remove `SyncButton` import (line 13)
- Remove `{!isMobile && <SyncButton />}` (lines 125-126)

### 2. Redesign ConversationListHeader

**File**: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`

Merge the two rows into one single flex row:

- **Container**: reduce padding to `p-1.5 md:p-2`
- **Single row**: `flex items-center gap-1`
- **Left group**: all action buttons in a `flex items-center gap-1 flex-wrap flex-1 min-w-0`
- **Right side**: Sort dropdown `ml-auto flex-shrink-0`
- **All buttons**: `h-6` height, `px-1.5` padding
- **Utility buttons** (Select, Merge, Migrate, Mark all read): `variant="ghost"` for lower visual weight
- **+New button**: keeps `variant="default"` as the primary CTA
- **Filters button**: keeps `variant="outline"` (switches to `default` when filters active)
- **Sort trigger**: `h-6`, `w-auto`, with `"Sort:"` prefix in muted text
- **Unread badge**: inlined before the Select button, `h-4` size for compactness

The active filter badges row (Row 3) remains unchanged -- it only appears when filters are active and provides useful context.

### Summary of visual improvements

| Aspect | Before | After |
|---|---|---|
| Rows | 2 rows (actions + sort) | 1 compact row |
| Button height | 28px (h-7) | 24px (h-6) |
| Container padding | p-2 / p-3 | p-1.5 / p-2 |
| Sort position | Isolated on own row | Inline, right-aligned |
| Sort label | None | "Sort:" prefix |
| Utility buttons | outline (heavy borders) | ghost (clean, minimal) |
| Sync button | Visible in header | Removed |
| Overall feel | Clunky, spread out | Dense, professional, Linear-inspired |

