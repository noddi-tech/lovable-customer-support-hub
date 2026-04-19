
## Plan addition: refetchOnMount on useApplicantPipeline

`useApplicantPipeline` lives in `src/components/dashboard/recruitment/applicants/useApplicants.ts` (lines 76-95). It loads the default pipeline (stages JSONB) used by the operations kanban board to render columns. It currently has no `refetchOnMount`, so it inherits the global `false` from `persistedQueryClient.ts` — meaning admin edits stay invisible until the persisted cache expires.

### Single change
**`src/components/dashboard/recruitment/applicants/useApplicants.ts`** — in `useApplicantPipeline()`, add `refetchOnMount: 'always'` next to the existing `enabled: !!currentOrganizationId,` line:

```ts
return useQuery({
  queryKey: ['recruitment-pipeline-default', currentOrganizationId],
  queryFn: async () => { /* unchanged */ },
  enabled: !!currentOrganizationId,
  refetchOnMount: 'always',
});
```

### Why
Mirrors the scoped fix already in place on `useApplicants`, `usePipelineAdmin.useDefaultPipeline`, and `useJobPositions`. Bypasses `localStorage` persisted cache on mount without touching global config (preserves the 99.9% uptime constraint).

### Integrates with the pipeline-editor build
`useUpdatePipelineStages` and `useReassignAndUpdateStages` already invalidate `recruitment-pipeline-admin`, but the operations kanban uses key `recruitment-pipeline-default`. Two ways to handle:
1. Add `queryClient.invalidateQueries({ queryKey: ['recruitment-pipeline-default'] })` to both mutations' `onSuccess` (covers same-tab navigation).
2. Rely on `refetchOnMount: 'always'` (covers new-tab/cross-tab navigation, which is the failure mode in the verification step).

Do **both** — invalidation handles same-tab, `refetchOnMount` handles new-tab/persisted cache.

### Verification
1. Edit stage name/order/color in `/admin/recruitment?tab=pipeline` → Save.
2. Open `/operations/recruitment/pipeline` in a new tab → new stages render immediately, no hard refresh needed.
3. Same-tab navigation between admin and operations also reflects changes (covered by invalidation).

### Files touched (added to the pipeline-editor plan)
- `src/components/dashboard/recruitment/applicants/useApplicants.ts` — add `refetchOnMount: 'always'` to `useApplicantPipeline`.
- `src/components/dashboard/recruitment/admin/pipeline/usePipelineAdmin.ts` — add `['recruitment-pipeline-default']` to both mutations' invalidation lists.
