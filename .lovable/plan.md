

## Rebuild User & Department Management with TanStack Data Tables

### Problem
1. The "Change Email" option lives in `UserActionMenu` but `UserManagement.tsx` uses its own inline edit/delete buttons -- it never renders `UserActionMenu`, so "Change Email" is missing
2. The card-based layout doesn't scale well for many users/departments
3. No sorting, filtering, or pagination

### Solution
Replace both the Users and Departments tabs with TanStack Table data tables featuring sorting, filtering, pagination, and row actions via `UserActionMenu`.

### Files

| # | File | Change |
|---|------|--------|
| 1 | `package.json` | Add `@tanstack/react-table` dependency |
| 2 | `src/components/admin/users/UserColumns.tsx` | New -- column definitions for users table (name, email, role badge, department, status badge, created date, actions via `UserActionMenu`) |
| 3 | `src/components/admin/users/UsersDataTable.tsx` | New -- generic DataTable component with sorting, filtering (search by name/email), pagination, column visibility |
| 4 | `src/components/admin/UserManagement.tsx` | Rewrite to use `UsersDataTable` + `UserColumns`. Keep create/edit user dialogs. Remove card-based rendering |
| 5 | `src/components/admin/departments/DepartmentColumns.tsx` | New -- column definitions for departments table (name, description, member count, created date, actions) |
| 6 | `src/components/admin/DepartmentManagement.tsx` | Rewrite to use `UsersDataTable` + `DepartmentColumns`. Keep create/edit dialogs |

### Data Table Features
- **Sorting**: Click column headers to sort asc/desc
- **Filtering**: Search input filtering by name/email (users) or name (departments)
- **Pagination**: Previous/Next with row count display
- **Row Actions**: Users table uses existing `UserActionMenu` (which already has Change Email, Manage Roles, Manage Organizations, Delete). Departments table gets an inline actions column with edit/delete buttons
- **Responsive**: Table scrolls horizontally on small screens

### Key Detail
The `UserActionMenu` component already has all the actions (Change Email, Manage Roles, Manage Orgs, Resend Invite, Delete). By wiring it into the users data table actions column, the "Change Email" option becomes available without any changes to `UserActionMenu` itself.

### Reusable DataTable
A single generic `DataTable` component will be created and used by both Users and Departments tabs. It accepts `columns` and `data` props following the TanStack Table pattern from the shadcn docs.

