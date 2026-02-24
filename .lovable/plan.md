

## Inbox UI/UX Improvements from v0 Suggestions

Integrate the visual enhancements from the v0-generated components into the existing codebase, adapting them to work with the current architecture (ConversationListContext, TableHeaderCell API, existing hooks).

### What changes (and what does NOT change)

The v0 output provides 4 component files. Rather than blindly replacing them (which would break due to API mismatches), we selectively adopt the **visual improvements** while keeping our existing architecture intact.

---

### 1. Enhanced SLABadge with time remaining and colored dots

**File:** `src/components/dashboard/conversation-list/SLABadge.tsx`

Replace the current minimal badge with the v0 version which adds:
- Colored status dot indicator (emerald/amber/red)
- Icon per status (CheckCircle/AlertCircle/XCircle)
- Time remaining display ("3h left") for at_risk and breached statuses
- Dark mode support with proper color tokens
- `cn()` utility import (currently missing)

The props interface stays the same (`status`, `slaBreachAt`), so no caller changes needed.

---

### 2. SLA left-border accent colors on conversation rows

**File:** `src/components/dashboard/conversation-list/ConversationTableRow.tsx`

Key visual changes adopted from v0:
- Add `getSLABorderColor()` utility that returns `border-l-4 border-green-500` / `border-amber-500` / `border-red-500` based on SLA status
- Apply the border class to both the virtualized `<div>` and the `<TableRow>`
- Add `group` class to rows for hover-based action reveal
- Enhanced status badges with icons (using `statusConfig` map with `MessageCircle`, `Clock`, `CheckCircle`, `XCircle`)
- Enhanced priority badge colors (slate/indigo/amber/red instead of current semantic tokens)
- Compact time formatting utility (`formatCompactTime`) showing "22h" instead of "about 22 hours"
- Hover-reveal reply button on rows (visible only on hover via `opacity-0 group-hover:opacity-100`)
- Row selection uses `bg-primary/8` instead of `bg-primary/5`
- Actions column hidden by default, shown on hover

**What stays the same:** All imports, hook usage, callback signatures, context integration, bulk selection logic.

---

### 3. Sticky table header with backdrop blur

**File:** `src/components/dashboard/conversation-list/ConversationTable.tsx`

Changes:
- Add `sticky top-0 z-20 bg-muted/50 backdrop-blur-sm border-b-2` to `TableHeader`
- Reorder columns: move Status and Priority **before** Channel (earlier in scan path for urgency assessment)
- Add `border rounded-lg` wrapper around the table
- Compact loading/empty states (smaller icons, `h-32` instead of full flex)

**Compatibility note:** The v0 `ConversationTable` calls `TableHeaderCell` without `currentSort` prop. Our existing `TableHeaderCell` requires it. We keep our existing `TableHeaderCell` API and pass `currentSort={state.tableSort}` as we do now.

---

### 4. Active filter chips in ConversationList

**File:** `src/components/dashboard/ConversationList.tsx`

Add a filter chips bar below the header that shows active filters as removable badges. This requires:
- Reading filter state from context (if `state.filters` exists) or from `state.statusFilter`/`state.priorityFilter`
- Rendering Badge chips with X buttons to clear individual filters
- "Clear All" button when multiple filters active

**Compatibility note:** The v0 version references `state.filters.status` (array), `CLEAR_FILTER`, and `CLEAR_ALL_FILTERS` actions that don't exist in our context. We'll adapt to use the existing `state.statusFilter`/`state.priorityFilter` string values and dispatch `SET_STATUS_FILTER`/`SET_PRIORITY_FILTER` with `'all'` to clear.

The v0 version also changes `SessionRecoveryBanner` props (`onDismiss` vs `onHide`, `SessionSyncButton` `onSync` vs `onSyncSuccess`, `BulkActionsBar` `count` vs `selectedCount`). We keep our existing prop names.

---

### Files affected (4 files)

1. `src/components/dashboard/conversation-list/SLABadge.tsx` -- full rewrite with v0 version
2. `src/components/dashboard/conversation-list/ConversationTableRow.tsx` -- visual enhancements (SLA borders, status icons, compact time, hover actions)
3. `src/components/dashboard/conversation-list/ConversationTable.tsx` -- sticky header, column reorder, rounded wrapper
4. `src/components/dashboard/ConversationList.tsx` -- add active filter chips display

### What we intentionally skip

- The v0 `ConversationList.tsx` changes prop names for `SessionRecoveryBanner`, `SessionSyncButton`, `BulkActionsBar`, and `ConversationListProvider` -- we keep our existing APIs
- The v0 `TableHeaderCell` API difference -- we keep our existing component unchanged
- No new dependencies needed -- all imports already exist in the project

