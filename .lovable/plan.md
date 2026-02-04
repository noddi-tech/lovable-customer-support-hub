
# Fix Tags Not Appearing in Pending Review Dropdown

## Problem Identified

The Refresh button in the Import section only invalidates the extraction job and pending entries queries, but **does NOT invalidate the tags query**. When new tags are added to the database, the TagMultiSelect component may still have stale cached data.

## Root Cause

Looking at the code:

```typescript
// Current Refresh button only invalidates these:
queryClient.invalidateQueries({ queryKey: ['knowledge-extraction-job', organizationId] });
queryClient.invalidateQueries({ queryKey: ['knowledge-pending-entries', organizationId] });

// But NOT the tags query:
// queryKey: ['knowledge-tags', organizationId]
```

Even though `TagMultiSelect` has `staleTime: 0` and `refetchOnMount: 'always'`, if the component is already mounted and the data was fetched earlier, it won't automatically refetch until the next mount or an explicit invalidation.

## Solution

Add the tags query to the Refresh button's invalidation list so that clicking Refresh also fetches the latest tags.

## Changes Required

| File | Change |
|------|--------|
| `KnowledgeImportFromHistory.tsx` | Add `knowledge-tags` to the Refresh button's query invalidation |

## Implementation

Update the Refresh button onClick handler (around line 351-354):

```typescript
onClick={() => {
  queryClient.invalidateQueries({ queryKey: ['knowledge-extraction-job', organizationId] });
  queryClient.invalidateQueries({ queryKey: ['knowledge-pending-entries', organizationId] });
  queryClient.invalidateQueries({ queryKey: ['knowledge-tags', organizationId] });
  queryClient.invalidateQueries({ queryKey: ['knowledge-categories', organizationId] });
}}
```

## Additional Benefit

This also ensures that:
1. Newly created categories appear in the category dropdown
2. Newly created tags appear in the tag multi-select
3. Any taxonomy changes made in Settings are immediately reflected in the Import review queue

## Testing

After this fix:
1. Navigate to Settings and create a new tag
2. Navigate to Import section
3. Click Refresh
4. The new tag should appear in the TagMultiSelect dropdown
