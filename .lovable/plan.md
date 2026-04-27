# Fix: Stale rule-count cache in dry-run trigger picker

## Problem
`useRuleCountByTrigger` is served entirely from persisted localStorage cache (`NODDI_QUERY_CACHE`). The global QueryClient has `refetchOnMount: false`, so once a stale snapshot is cached (e.g. before `application_created` rule existed), it never refreshes — picker shows `(0 regler)` instead of `(1 regel)`.

## Fix
One-line addition to `src/components/dashboard/recruitment/admin/rules/dryrun/hooks/useRuleCountByTrigger.ts`:

```ts
return useQuery({
  queryKey: ['recruitment-automation-rule-counts-by-trigger', orgId],
  queryFn: async (): Promise<Record<string, number>> => { ... },
  enabled: !!orgId,
  staleTime: 30_000,
  refetchOnMount: 'always',  // ← ADD
});
```

Matches the existing precedent in `src/components/dashboard/recruitment/admin/rules/hooks/useRules.ts` (line 12).

## Why this works
- Forces a fresh fetch on every mount of `DryRunForm`, healing existing stale localStorage caches.
- `staleTime: 30_000` is preserved → rapid re-mounts within 30s still serve from cache.
- Self-contained, zero impact on other queries or global config.

## Verification
- After fix: hard-refresh `/admin/recruitment?tab=automation&subtab=dry-run`, observe Network tab firing `select=trigger_type` request, picker should show `(3 regler)` for stage_entered and `(1 regel)` for application_created.
- TypeScript: no type changes, compiles cleanly.
