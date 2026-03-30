

## Switch Notifications to Custom Shadcn Table (Conversation List Pattern)

### What the user wants

Replace the generic `DataTable` wrapper with a purpose-built table using raw Shadcn `<Table>` primitives + custom `TableHeaderCell` — the same pattern used in the conversation list. This gives more control over layout, row styling, and interaction without the overhead of the DataTable abstraction.

### Changes

| # | File | Change |
|---|------|--------|
| 1 | `src/pages/NotificationsPage.tsx` | Remove `DataTable` import. Build a custom table using `Table`, `TableBody`, `TableHeader`, `TableRow`, `TableCell` from Shadcn + `TableHeaderCell` for sortable columns. Add local sort state (`useState` for sort key/direction), a search input with `Search` icon, and manual filtering/sorting logic. Keep existing header, tabs, refresh, mark-all-read buttons unchanged. |

### Implementation detail

- **Sort state**: `useState<{ key: string; direction: 'asc' | 'desc' | null }>` with `handleSort` toggling through asc → desc → null
- **Search**: Local `searchQuery` state filtering notifications by title/message (case-insensitive)
- **Sorting**: `useMemo` sorting `filteredNotifications` by the active sort key (time, title, type)
- **Columns**: Same layout as current NotificationColumns but rendered inline — Status dot, Type icon, Notification (title + message + priority badges, clickable), Time (relative), Actions (mark read / view / delete)
- **Row styling**: Unread rows get subtle `bg-muted/30`, priority left borders kept
- **No pagination** — scrollable list (matches conversation list pattern)
- **Reuses** existing `TableHeaderCell` component from `src/components/dashboard/conversation-list/TableHeaderCell.tsx`

### Removes dependency on
- `src/components/admin/DataTable.tsx` (no longer imported)
- `src/components/notifications/NotificationColumns.tsx` (columns defined inline in the page)

