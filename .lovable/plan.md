

## Findings (data flow audit)

1. **`PositionsTable`** (line 19) uses `useJobPositions()` from `usePositions.ts` — same hook everywhere (PipelineFilters, ApplicantsFilterBar, CreateApplicantDialog, ImportConfigureStep all share it). No alternative list query exists.

2. **`PositionStatusBadge`** is correct — `STATUS_MAP['open']` → "Åpen". No fallback bug. Both `PositionsTable` and `PositionDetail` render the exact same component.

3. **`useJobPositions` query** uses `.select('*, applications(count)')` — wildcard correctly returns `status`. DB confirms: position `05deb373…` has `status='open'`, `published_at='2026-04-19 13:43:08'`. So the data in Postgres is correct.

4. **`PositionDetail`** uses a different query key (`['job-position', id]`) hitting the same table with `*, recruitment_pipelines(...)`. That's why it shows the fresh "Åpen" — different cache entry, refetched on detail page mount.

5. **Root cause — persisted query cache**: `src/lib/persistedQueryClient.ts` wraps the app in `PersistQueryClientProvider` with `createSyncStoragePersister` against `localStorage` (key `NODDI_QUERY_CACHE`), and sets these defaults:
   - `gcTime: 24h`
   - `staleTime: 10 min` (global default)
   - **`refetchOnMount: false`**
   - **`refetchOnWindowFocus: false`**
   
   Even though `useJobPositions` overrides `staleTime: 10_000` and `refetchOnWindowFocus: true`, **it does NOT override `refetchOnMount`**. Combined with the localStorage persistence, a stale `['job-positions', orgId]` snapshot (with `status: 'draft'`) is rehydrated from localStorage on every page load and never refetched on mount — so a hard refresh keeps showing "Utkast" indefinitely until either (a) the 10-second staleness triggers a window-focus refetch, or (b) a mutation explicitly invalidates AND refetches the key.

   The status-change mutation (`useUpdateJobPositionStatus`) does call `refetchQueries({ queryKey: ['job-positions'] })`, but if the user changed status from the **detail page** while the list query was either (i) inactive (no observers) or (ii) still in localStorage, the persisted snapshot wins on next mount.

## Fix

Single targeted change in `src/components/dashboard/recruitment/positions/usePositions.ts` — add `refetchOnMount: 'always'` to `useJobPositions`:

```ts
return useQuery({
  queryKey: ['job-positions', currentOrganizationId],
  queryFn: async () => { /* unchanged */ },
  enabled: !!currentOrganizationId,
  staleTime: 10_000,
  refetchOnMount: 'always',     // <-- NEW: bypass persisted-cache staleness
  refetchOnWindowFocus: true,
});
```

Also add `refetchOnMount: 'always'` to `useJobPosition(id)` (the detail query) for symmetry — same persistence trap applies there.

## Why not change global defaults

Touching `persistedQueryClient.ts` would affect every query in the app (conversations, customers, etc.) and risks the "99.9% uptime" core constraint. Scoping the override to the two recruitment-position queries fixes the bug without collateral risk.

## Verification after fix

1. Hard-refresh `/operations/recruitment/positions` → list immediately shows "Åpen" matching the detail page.
2. Change status on detail page → list reflects change without manual reload.
3. No regression to other tables that consume `useJobPositions` (Pipeline filters, Applicants filter, Create applicant dialog, Import configure step).

