## Fix: Wrong table names in ExecutionDetailDrawer name resolution

Single-file, surgical fix. The skipped-execution drawer queries non-existent tables (`recruitment_applications`, `recruitment_applicants`), so applicant email resolution silently returns `null` (errors swallowed by `as any` cast). Actual tables are `applications` and `applicants`.

### Change

**File:** `src/components/dashboard/recruitment/admin/rules/executions/ExecutionDetailDrawer.tsx` (lines 90–101)

Replace the application/applicant join in the `nameMaps` query:

```ts
applicationIds.length
  ? (supabase as any)
      .from('applications')
      .select('id, applicants(email, first_name, last_name)')
      .in('id', applicationIds)
  : Promise.resolve({ data: [] as any[] }),
```

And update the map builder to read the corrected nested field name (`applicants`, plural — PostgREST FK convention, matches `useApplicantsSearch`):

```ts
const applicantEmailMap = new Map<string, string | null>(
  ((appsRes.data ?? []) as any[]).map((a) => [a.id, a.applicants?.email ?? null]),
);
```

No other usage sites change — `nameMaps?.applicantEmailMap.get(...)` consumer at line 216 stays the same.

### Verify

1. `npx tsc --noEmit` clean.
2. Skipped `send_email` row drawer shows resolved recipient email instead of `—`.
