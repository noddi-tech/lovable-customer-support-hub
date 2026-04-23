
Implement Phase 3 by adding an execution-log feature set under Recruitment Admin, with parent-owned state and Radix-safe overlay handling throughout.

## What will be built

### 1. Automation sub-tabs inside `RulesTab`
Split the existing Automatisering content into two internal sub-tabs:

- `Regler`
- `Utførelseslogg`

The sub-tab will be URL-driven via `?tab=automation&subtab=rules|log` so refresh and deep links work.

### 2. Execution log UI
Add a paginated execution log view with:

- desktop table + mobile stacked cards
- columns: `Regel`, `Status`, `Søker`, `Tidspunkt`, `Bekreftet`
- quick row-level `Bekreft` action for failed, unacknowledged rows
- row click opens a detail drawer
- empty state: `Ingen utførelser ennå`
- pagination footer: `Viser X–Y av Z`

### 3. Execution detail drawer
Add a right-side Sheet drawer with:

- metadata block
- action result cards
- collapsible raw `trigger_context`
- footer acknowledge action
- sticky header/footer and scrollable body

The drawer will be mounted at `ExecutionLogPanel` level, never inside a row, to avoid the Phase 2 unmount/overlay cleanup bug.

### 4. Failure banner at top of Recruitment Admin
Render a top-of-page destructive alert above the main admin tabs when there are unacknowledged failed executions.

It will:
- show pluralized Norwegian copy
- appear on Pipeline, E-postmaler, and Automatisering
- auto-hide when count returns to 0
- navigate to `?tab=automation&subtab=log`

### 5. Realtime failure toast
Mount a side-effect hook in `RecruitmentAdmin` that listens for new failed executions and shows a deduped Sonner toast with action to open the execution log.

## Files to create

```text
src/components/dashboard/recruitment/admin/
  FailureBanner.tsx
  hooks/
    useFailureCount.ts
    useExecutionRealtimeToast.ts

src/components/dashboard/recruitment/admin/rules/executions/
  ExecutionLogPanel.tsx
  ExecutionLogTable.tsx
  ExecutionLogRow.tsx
  ExecutionDetailDrawer.tsx
  hooks/
    useExecutions.ts
    useExecutionMutations.ts
  types.ts
```

## Files to modify

```text
src/pages/admin/RecruitmentAdmin.tsx
src/components/dashboard/recruitment/admin/rules/RulesTab.tsx
```

## Implementation design

### A. `RulesTab.tsx`
Refactor current content into:

- a sub-tab shell driven by `useSearchParams`
- `Regler` tab = existing rule list/editor/delete dialog content
- `Utførelseslogg` tab = new `ExecutionLogPanel`

Important detail:
`RecruitmentAdmin` currently replaces search params with `{ tab: value }`, which would wipe `subtab`. This will be adjusted so top-level tab changes preserve unrelated params where appropriate, while banner actions can explicitly set `tab=automation&subtab=log`.

### B. `RecruitmentAdmin.tsx`
Add:

- `<FailureBanner />` above the main tabs
- `useExecutionRealtimeToast(...)` inside the component as an invisible side-effect hook

This keeps observability active regardless of which recruitment admin tab is open.

### C. `useExecutions.ts`
Implement paginated querying against `recruitment_automation_executions` scoped by org ID, ordered by `created_at desc`.

Return shape:
- `data`
- `totalCount`
- `isLoading`
- `error`

Refinement based on the existing schema:
- execution rows already store `rule_name`, `rule_id`, `applicant_id`, `triggered_by`, `acknowledged_by`, `trigger_context`, `action_results`, `duration_ms`, `is_dry_run`, `overall_status`
- to preserve historical accuracy for renamed/deleted rules, the UI should prefer the stored `rule_name` from the execution row
- separate in-memory enrichment will still be used for:
  - applicant display names from `applicants`
  - triggered/acknowledged profile names from `profiles`

No PostgREST nested selects will be used.

### D. `useFailureCount.ts`
Query count of:
- `organization_id = current org`
- `overall_status = 'failed'`
- `acknowledged_at is null`
- `is_dry_run = false`

Used only by `FailureBanner`.

### E. `useExecutionRealtimeToast.ts`
Subscribe to Supabase Realtime for inserts on `recruitment_automation_executions` filtered by org ID.

On incoming failed non-dry-run rows:
- show `toast.error(...)` with `id: 'automation-failures'`
- description should use execution `rule_name`
- action navigates to `?tab=automation&subtab=log`
- invalidate failure count + execution list queries

Implementation will use `useQueryClient()` inside the hook and clean up the channel on unmount/org change.

### F. `useExecutionMutations.ts`
Implement acknowledge mutation via the RPC that exists in the current schema.

Important schema refinement:
- the generated Supabase types expose `acknowledge_execution(p_execution_id uuid)`
- not `acknowledge_automation_execution(...)`

So the implementation should call the existing RPC name unless the database is separately changed.

Behavior:
- invalidate failure count and execution-list queries on success
- row quick-ack can show a toast
- drawer ack can skip toast

Acknowledge-twice behavior will be handled as idempotent in the UI: if the RPC returns success or current acknowledged data, no error toast is shown.

### G. `ExecutionLogPanel.tsx`
Own all stable page-level state:

- selected execution for drawer
- current pagination page
- maybe active status filter placeholder state if needed later

This component will:
- fetch paginated data
- open/close the drawer
- pass ack handlers down
- keep the drawer mounted above rows

### H. `ExecutionLogTable.tsx` and `ExecutionLogRow.tsx`
Render:
- table on desktop
- stacked cards on mobile

Row behavior:
- click row/card opens drawer
- quick-ack button uses `stopPropagation()`
- failed + unacknowledged rows get red left border
- acknowledged rows show green checkmark + label
- success/dry_run rows show em dash

### I. `ExecutionDetailDrawer.tsx`
Use the same Radix-safe pattern already used in `RuleEditor`:

- component owns `sheetOpen`
- `handleOpenChange(false)` does `setSheetOpen(false)` then `setTimeout(() => onClose(), 150)`

This prevents parent state clearing during Radix cleanup.

Drawer content:
- header with title + status badge
- metadata section
- action result cards
- collapsible raw JSON context
- sticky footer with acknowledge state or read-only confirmation text

No nested dropdown/dialogs are needed in this phase.

## Technical details

### Status presentation
Add shared display helpers in `executions/types.ts`:

- `success` → green, `Vellykket`
- `partial` → amber, `Delvis feilet`
- `failed` → red, `Feilet`
- `dry_run` → gray/italic, `Test-kjøring`

For `partial`, support tooltip text like `X av Y handlinger feilet` when computable from `action_results`.

### Time formatting
Use existing project patterns for relative and absolute time:
- relative text in Norwegian
- absolute timestamp in tooltip / metadata using `nb-NO`

### Applicant link
If `applicant_id` exists, link to:
- `/operations/recruitment/applicants/{id}`

### Trigger context collapse
Use an existing lightweight collapsible pattern already present in the codebase rather than introducing a heavier new abstraction.

### Query keys
Use explicit query keys such as:
- `['recruitment-automation-executions', orgId, limit, offset, statusFilter]`
- `['recruitment-automation-failure-count', orgId]`

### Realtime publication pre-check
Because read-only mode cannot query the database directly, implementation should first verify whether `public.recruitment_automation_executions` is already in `supabase_realtime`.

If not, add a migration like:
```sql
alter publication supabase_realtime add table public.recruitment_automation_executions;
```

## Radix safety rules applied in this phase

1. `ExecutionDetailDrawer` uses parent-owned selected execution + internal `sheetOpen`
2. `handleOpenChange` uses delayed parent cleanup (`setTimeout(..., 150)`)
3. Drawer is mounted in `ExecutionLogPanel`, not in row components
4. No new row-owned modal overlays
5. If any new `DropdownMenu` is introduced in this phase, it must use `modal={false}` and `requestAnimationFrame` handoff

## Verification checklist to run after implementation

1. Automatisering shows `Regler | Utførelseslogg`
2. URL updates with `subtab`
3. Refresh/deep-link preserves log view
4. Execution list loads or shows empty state
5. Status badges render correctly
6. Failed unacknowledged rows have red left border
7. Rule names degrade gracefully for deleted rules
8. Applicant names resolve when possible
9. Relative timestamps + absolute tooltip work
10. Row click opens drawer
11. Quick-ack does not open drawer
12. Drawer shows metadata/action results/raw context
13. Closing drawer leaves no `body { pointer-events: none }`
14. Realtime toast appears for new failed non-dry-run execution
15. Banner appears above all recruitment admin tabs
16. Banner click navigates to `tab=automation&subtab=log`
17. Quick-ack updates row + count immediately
18. Drawer ack updates footer + count immediately
19. Acknowledge-twice does not surface a noisy error
20. Realtime publication is confirmed or migration added

## Reply after implementation
Return:
1. File tree under `executions/`
2. `useExecutionRealtimeToast`
3. `useFailureCount`
4. `ExecutionDetailDrawer` `handleOpenChange`
5. Confirmation that any `DropdownMenu` added in this phase uses `modal={false}`
6. Confirmation that `ExecutionDetailDrawer` is mounted at `ExecutionLogPanel` level
7. The Realtime publication migration file, or confirmation the table was already in the publication
