

# Fix: Action Flows Not Displaying

## Root Cause

The 7 action flows were successfully seeded into the database (confirmed via direct query), but the UI is showing "No action flows yet." This is a stale cache / query timing issue -- the data was inserted via migration after the page was already loaded, and React Query is serving cached (empty) results.

## Fix

Update the `useQuery` in `ActionFlowsManager.tsx` to ensure it always fetches fresh data on mount:

**File: `src/components/admin/widget/ActionFlowsManager.tsx`**
- Add `staleTime: 0` and `refetchOnMount: 'always'` to the query options
- This ensures the query always hits the database when the tab is opened, rather than serving stale cached results

This is a one-line change that will make the flows appear immediately when you navigate to the Action Flows tab.

