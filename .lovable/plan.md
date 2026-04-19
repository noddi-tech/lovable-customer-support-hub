
## Plan: Fix stale cache for recruitment lists after CSV import

Three scoped changes — no global config touched.

### 1. `src/components/dashboard/recruitment/import/useImport.ts`
The mutation already has an `onSuccess` invalidating `['applicants']`, `['pipeline-applications']`, `['job-positions']`. Expand it to cover all recruitment keys:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['applicants'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-applications'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline'] });
  queryClient.invalidateQueries({ queryKey: ['job-positions'] });
  queryClient.invalidateQueries({ queryKey: ['job-position'] });
  queryClient.invalidateQueries({ queryKey: ['applicant-profile'] });
},
```
(Note: actual pipeline query key is `['pipeline-applications', ...]` per `usePipeline.ts`, so keep that one and also add `['pipeline']` as requested for any future hooks.)

### 2. `src/components/dashboard/recruitment/applicants/useApplicants.ts`
Add `refetchOnMount: 'always'` to the `useApplicants` query options (after `enabled`). Bypasses persisted-cache staleness on mount, mirroring the `useJobPositions` fix.

### 3. `src/components/dashboard/recruitment/pipeline/usePipeline.ts`
Add `refetchOnMount: 'always'` to `usePipelineApplications` (alongside existing `placeholderData: keepPreviousData`).

### Why this works
- `PersistQueryClientProvider` rehydrates `['applicants', orgId, ...]` and `['pipeline-applications', orgId, ...]` from localStorage on every page load with `refetchOnMount: false`. Mutation invalidation only refetches **active** observers — when the user is on the import page, the list/pipeline pages have no observers, so invalidation marks them stale but the next mount serves persisted (empty) data.
- `refetchOnMount: 'always'` forces a network fetch when the component mounts, regardless of staleness or persisted data → the 10 imported rows show up immediately.
- The expanded `onSuccess` covers any in-tab observers that ARE active.

### Files modified
- `src/components/dashboard/recruitment/import/useImport.ts`
- `src/components/dashboard/recruitment/applicants/useApplicants.ts`
- `src/components/dashboard/recruitment/pipeline/usePipeline.ts`

### Verification
1. After import wizard completes → navigate to `/operations/recruitment/applicants` → 10 rows visible.
2. Navigate to `/operations/recruitment/pipeline` → 10 cards in "Ikke vurdert" column.
3. Hard refresh both pages → still visible (fetch on mount, not persisted snapshot).
