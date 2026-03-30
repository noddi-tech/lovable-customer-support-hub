

## Replace Notification List with TanStack DataTable

### What changes

Replace the current custom notification list (grouped cards with hover actions) with the existing `DataTable` component powered by TanStack Table — matching the pattern used in admin pages. This gives sorting, pagination, global search, and a clean tabular layout.

### Files

| # | File | Change |
|---|------|--------|
| 1 | `src/components/notifications/NotificationColumns.tsx` | **New file.** Define `ColumnDef<EnhancedNotification>[]` with columns: Status (read/unread dot), Type (category icon), Title+Message (combined cell with priority badge), Time (relative timestamp with sortable accessor), and Actions (Mark read, View, Delete buttons). Row click navigates to source. |
| 2 | `src/pages/NotificationsPage.tsx` | Replace the entire notification list section (grouped rendering, search input, `NotificationListItem` usage) with `<DataTable>` using the new columns. Pass `filteredNotifications` as data, use `globalFilter` mode, and remove the separate search input (DataTable has its own). Keep the header, tabs, refresh, and mark-all-as-read buttons unchanged. |
| 3 | `src/components/notifications/NotificationListItem.tsx` | No changes — kept for potential reuse in dropdown, but no longer used by the page. |

### Column layout

| Column | Width | Content |
|--------|-------|---------|
| Status | 40px | Unread dot (blue circle) or empty |
| Type | 50px | Category icon (Phone, Mail, etc.) |
| Notification | flex | Title (bold if unread) + message preview (line-clamp-1) + priority/assigned badges |
| Time | 120px | Relative time, sortable by `created_at` |
| Actions | 100px | Mark read / View / Delete icon buttons |

### Key details

- Reuses existing `DataTable` component with `globalFilter={true}` for search
- Row styling: unread rows get `bg-muted/30` via a custom row className
- Priority indicator: colored left border on the notification cell (urgent=red, high=warning)
- Clicking a row navigates to the source (conversation/ticket/call) — same `handleNavigate` logic
- Pagination built-in from DataTable (10 rows per page by default)
- All existing mutations (markAsRead, markAllAsRead, delete) injected into column actions via row data callbacks

