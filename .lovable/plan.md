
Implement only the two approved diagnostics fixes, with no unrelated edits.

## Scope

### Fix A: Fresh-on-mount data for execution log and failure count
Update these hooks only:

- `src/components/dashboard/recruitment/admin/rules/executions/hooks/useExecutions.ts`
- `src/components/dashboard/recruitment/admin/hooks/useFailureCount.ts`

Add the same React Query overrides to both `useQuery(...)` calls:

```ts
staleTime: 0,
refetchOnMount: 'always',
```

Purpose:
- bypass the persisted stale cache specifically for execution-log data
- keep the rest of the app’s global QueryClient persistence behavior unchanged

No changes to:
- query keys
- query functions
- invalidation logic
- global QueryClient config

### Fix B: Realtime subscription instrumentation
Update only:

- `src/components/dashboard/recruitment/admin/hooks/useExecutionRealtimeToast.ts`

Change the current terminal subscription call from:

```ts
.subscribe();
```

to:

```ts
.subscribe((status, err) => {
  console.log('[recruitment-automation-failures] channel status:', status);

  if (err) {
    console.error('[recruitment-automation-failures] channel error:', err);
  }
});
```

Purpose:
- expose whether the channel reaches `SUBSCRIBED`
- surface `TIMED_OUT`, `CHANNEL_ERROR`, or `CLOSED`
- preserve current toast and invalidation behavior

No changes to:
- channel name
- filter
- payload handler
- toast content
- navigation
- cleanup

## Expected outcome after implementation

1. Opening `/admin/recruitment?tab=automation&subtab=log` refetches execution rows immediately instead of trusting persisted cache.
2. Failure banner count also refetches on mount.
3. Browser console shows realtime channel lifecycle status so the subscription can be verified live.

## Verification

1. Hard refresh on `/admin/recruitment?tab=automation&subtab=log`
2. Confirm execution log now reflects all current rows from Supabase, not just persisted older rows
3. Confirm failure banner count matches current unacknowledged failed rows
4. Open browser console and verify a log like:
   - `[recruitment-automation-failures] channel status: SUBSCRIBED`
5. If status is not `SUBSCRIBED`, capture the exact status/error for the next diagnostic step

## Return after implementation

Provide exactly:
1. The updated `useQuery` config in `useExecutions.ts`
2. The updated `useQuery` config in `useFailureCount.ts`
3. The updated `.subscribe()` call in `useExecutionRealtimeToast.ts`
