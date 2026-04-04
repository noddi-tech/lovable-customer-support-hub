

# Add Bulk Outreach to Operations Sidebar

## Problem
The Bulk Outreach link exists in `nav-config.ts` but the Operations sidebar (`OperationsSidebar.tsx`) uses a separate hardcoded list of items that was never updated. The route also uses `/bulk-outreach` instead of the `/operations/` prefix pattern used by all other operations pages.

## Changes

### 1. Add Bulk Outreach to OperationsSidebar.tsx
Add a new entry to the `operationsItems` array (before Settings):
```
{ title: 'Bulk Outreach', path: '/operations/bulk-outreach', icon: Send }
```
Import `Send` from lucide-react.

### 2. Update route path to `/operations/bulk-outreach`
- **`src/App.tsx`**: Change the route from `/bulk-outreach` to `/operations/bulk-outreach`
- **`src/navigation/nav-config.ts`**: Update the `to` field from `/bulk-outreach` to `/operations/bulk-outreach`

### 3. Update Index.tsx to handle the new sub-route
Add `/operations/bulk-outreach` handling in the operations section of `renderContent()` so it renders the `BulkOutreach` page within the operations layout, or keep it as a standalone route — whichever matches the existing pattern for operations pages.

This ensures Bulk Outreach appears in the sidebar alongside the other operations items and follows the consistent `/operations/` URL pattern.

