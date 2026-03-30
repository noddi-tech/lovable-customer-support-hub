

## Replace Card-Based User List with DataTable in Super Admin All Users

### What changes
Replace the card-based user list (lines 617-770 in `AllUsersManagement.tsx`) with the existing `DataTable` component, and create new column definitions tailored to the super admin view which has richer data (system roles, org memberships, auth status, invite status).

### Files

| # | File | Change |
|---|------|--------|
| 1 | `src/components/admin/users/AllUserColumns.tsx` | New column definitions for super admin users table: Name (with system role badges), Email, System Roles, Organizations (membership badges), Login Status (last seen / never logged in + invite status), Created date, Actions (Activity button + `UserActionMenu`) |
| 2 | `src/pages/AllUsersManagement.tsx` | Replace the card-based `<Card>` user list section (lines 617-770) with `<DataTable columns={allUserColumns} data={filteredUsers} .../>`. Keep all existing functionality: header, filters card, orphaned users cleanup, create/add-existing dialogs, activity timeline modal |

### Column design for AllUserColumns

- **Name**: `full_name` with system role badges (Super Admin crown, Admin shield, etc.) inline
- **Email**: sortable
- **Organizations**: renders org membership badges with role tags (same as current card view)
- **Status**: login status — "Last seen X ago" or "Never logged in" + invite delivery status badge
- **Created**: formatted date, sortable
- **Actions**: Activity button + `UserActionMenu` component

### Key details
- Reuses the existing generic `DataTable` component from `src/components/admin/DataTable.tsx` with `globalFilter` enabled
- The search input in the filters card can be removed since `DataTable` has its own built-in search — or we keep the org filter in the card and let `DataTable` handle text search
- Activity timeline modal stays unchanged, triggered from the actions column
- `UserActionMenu` is wired into actions column same as the admin users table

