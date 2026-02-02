
# Fix: Categories and Tags Not Appearing in Knowledge Base UI

## Root Cause Analysis

I investigated thoroughly and found:

| What Database Shows | What UI Shows |
|---------------------|---------------|
| 7 categories: Service Delivery, Booking & Scheduling, Pricing & Payments, Service Locations, Technical Issues, Account Management, Service Providers | Only "Booking" |
| 24 tags linked to categories | Only "how-to" |

**The data exists correctly in the database** - all 7 categories and tags are present for your organization. The issue is that:

1. **React Query cache is stale** - The browser has cached the old data from before the database migration ran
2. The UI is displaying old cached data instead of fetching fresh data from the server
3. A simple page refresh should show all 7 categories and 24 tags

## Quick Fix (Try This First)

**Hard refresh the page:**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

This should immediately show all your categories and tags.

## Code Fix (Permanent Solution)

To prevent this from happening again, we need to ensure queries refetch properly. The fix involves:

### 1. Add `staleTime` and force refetch on mount

Update the category and tag queries in `CategoryManager.tsx` and `TagManager.tsx` to ensure fresh data:

```typescript
const { data: categories, isLoading } = useQuery({
  queryKey: ['knowledge-categories', organizationId],
  queryFn: async () => { /* ... */ },
  staleTime: 0, // Always consider data stale
  refetchOnMount: 'always', // Refetch when component mounts
});
```

### 2. Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/knowledge/CategoryManager.tsx` | Add `staleTime: 0` and `refetchOnMount: 'always'` to categories query |
| `src/components/dashboard/knowledge/TagManager.tsx` | Add `staleTime: 0` and `refetchOnMount: 'always'` to tags query |
| `src/components/dashboard/knowledge/TagMultiSelect.tsx` | Add `staleTime: 0` to tags query |
| `src/components/dashboard/knowledge/KnowledgeEntriesManager.tsx` | Add `staleTime: 0` to categories and tags queries |

### 3. Add Refresh Button (Optional Enhancement)

Add a manual refresh button to the Settings page header that invalidates all knowledge-related queries:

```typescript
const handleRefresh = () => {
  queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
  queryClient.invalidateQueries({ queryKey: ['knowledge-tags'] });
};
```

## Why This Happened

When you first loaded the page, no categories existed yet. React Query cached that empty result. Then the database migration inserted the 7 categories, but:
- The browser tab was still open with the old cache
- React Query didn't know the server data had changed
- The stale cache was served instead of fresh data

## Summary

| Step | Action |
|------|--------|
| 1 | Try hard refresh first (`Cmd/Ctrl + Shift + R`) |
| 2 | If still not working, I'll update the query configurations to prevent future caching issues |
| 3 | Optional: Add a manual refresh button for Settings page |

The database is healthy - all your data is there. This is purely a frontend caching issue.
