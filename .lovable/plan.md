
Implement Phase 4 by adding a third Automation sub-tab, `Test-kjøring`, with a form-driven dry-run flow that calls the existing `execute_automation_rules(..., p_dry_run=true)` RPC and renders inline simulation results without side effects.

## What will be built

### 1. Extend Automation sub-tabs in `RulesTab`
Update the existing URL-driven sub-tab logic to support:

- `rules`
- `log`
- `dry-run`

Changes:
- add a third trigger: `Test-kjøring`
- preserve existing `tab=automation`
- keep unrelated search params intact
- render `DryRunPanel` when `subtab=dry-run`
- deep-linking to `?tab=automation&subtab=dry-run` should open the dry-run UI directly

### 2. New `dryrun/` feature folder
Create:

```text
src/components/dashboard/recruitment/admin/rules/dryrun/
  DryRunPanel.tsx
  DryRunForm.tsx
  DryRunResults.tsx
  DryRunResultCard.tsx
  hooks/
    useDryRunMutation.ts
    useApplicantsSearch.ts
    useStages.ts
  types.ts
```

### 3. `DryRunPanel` container
This component will own all user-facing state:

- `triggerType` defaulting to `stage_entered`
- `stageId`
- `applicantId`
- selected applicant object for display in the combobox
- latest results from the RPC
- cleared/idle/success/error flow handling

Layout:
- title
- short explanation that this simulates automation with no side effects
- note that results are also written to `Utførelseslogg` with `Test-kjøring` badge
- `DryRunForm`
- `DryRunResults`

Behavior:
- preserve form values after each run
- `Tøm` resets inputs and clears results
- rerunning replaces previous results with new results

### 4. `DryRunForm` inputs
Build a compact form with:

#### Trigger type
Use the same labels already defined in recruitment automation types for consistency:
- `Søker bytter til en fase`
- `Ny søknad opprettes`

#### Conditional stage picker
Only show when trigger type is `stage_entered`.
- load real stages from DB
- required only in this trigger mode

#### Applicant searchable picker
Use the existing `Popover + Command` pattern from the UI library:
- search opens in a popover
- query starts searching at 2+ characters
- results show applicant name, email, and current stage
- selected value remains visible after run
- applicant is required

#### Buttons
- `Kjør test`: disabled while pending or missing required fields
- `Tøm`: clears form and results

### 5. `useApplicantsSearch`
Create a search hook for the applicant combobox.

Query behavior:
- search `applicants` by `first_name`, `last_name`, and `email`
- scope by current organization
- limit to 20
- only run when org exists and query length >= 2
- override query freshness for search UX:
  - `staleTime: 30_000`
  - `refetchOnMount: 'always'`

To show current stage labels:
- fetch matching applicants first
- collect distinct `current_stage_id` values from `applications`
- fetch matching rows from `recruitment_pipeline_stages`
- map stage names/colors in memory
- return a typed list ready for the combobox UI

### 6. `useStages`
Create a small hook for the conditional stage dropdown:
- query `recruitment_pipeline_stages`
- order by `order_index`
- scope by current organization
- use longer cache lifetime since stages change rarely

### 7. `useDryRunMutation`
Wrap the RPC call in a mutation.

RPC contract to use:
- `p_trigger_type`
- `p_trigger_context`
- `p_dry_run: true`

Trigger context payload:
- always include `organization_id`
- always include `applicant_id`
- include `to_stage_id` only for `stage_entered`

On success:
- return typed result rows
- invalidate `['recruitment-automation-executions', orgId]` so log tab can pick up new dry-run rows
- do not invalidate failure count

On error:
- surface the error back to the panel/results UI

### 8. Inline results rendering
`DryRunResults` will support five states:

1. Idle:
   - subtle placeholder or no output

2. Pending:
   - spinner + `Kjører test...`

3. Error:
   - destructive alert with backend error text

4. Success with 0 rows:
   - info state:
   - `Ingen regler matchet dette scenariet`

5. Success with 1+ rows:
   - render one `DryRunResultCard` per matched rule

### 9. `DryRunResultCard`
Render each matched rule as a standalone card, mirroring the structure of the execution detail UI where practical.

Show:
- rule name
- overall status badge
- duration in ms
- action-by-action breakdown from `action_results`

Language should clearly indicate simulation:
- `Ville sendt e-post`
- `Ville tildelt ansvarlig`
- `Ville kalt webhook`

If the engine returns actual failure states during dry-run, display them faithfully:
- status badge should reflect returned `overall_status`
- per-action failures should show the error message

Footer action:
- `Åpne i utførelseslogg`
- link to `?tab=automation&subtab=log`
- no row-highlighting dependency required for v1

## Design/behavior constraints

- Preserve Phase 3 execution-log behavior unchanged.
- Failure banner must continue excluding dry-run rows; current `useFailureCount` already filters `is_dry_run = false`.
- Avoid stacked modal overlays.
- For applicant search, use `Popover`/`Command`, not `DropdownMenu`.
- No `modal={false}` change should be necessary in this phase because:
  - `Popover` is already the intended non-stacked pattern here
  - no drawer/dialog is mounted from inside the popover flow

## Technical details

### Existing patterns to reuse
- Trigger labels already exist in `src/components/dashboard/recruitment/admin/rules/types.ts`
- Execution status rendering helpers already exist under `rules/executions/types.ts`
- The app already uses React Query with local persistence, so hook-level freshness overrides should be applied where interactive search needs it
- `FailureBanner` already excludes dry-run rows via:
  - `overall_status = 'failed'`
  - `is_dry_run = false`
  - `acknowledged_at IS NULL`

### RPC typing
The generated Supabase types already define:
- `execute_automation_rules`
- args:
  - `p_trigger_type: string`
  - `p_trigger_context: Json`
  - `p_dry_run?: boolean`
- returns rows with:
  - `rule_id`
  - `rule_name`
  - `overall_status`
  - `action_results`
  - `duration_ms`
  - `execution_id`

### Data shape considerations
`applications.current_stage_id` is stored on the `applications` table, not `applicants`, so applicant search should enrich applicant rows with current stage info via a second step rather than assuming a direct applicant column.

## Verification

1. Automatisering shows three sub-tabs: `Regler | Utførelseslogg | Test-kjøring`
2. `?tab=automation&subtab=dry-run` opens the dry-run panel
3. Trigger picker shows the Norwegian labels already used elsewhere
4. Stage field appears only for `stage_entered`
5. Stage field loads real DB stages
6. Applicant search opens, filters at 2+ chars, and shows name + email + current stage
7. `Kjør test` stays disabled until required fields are present
8. Dry-run results render inline after execution
9. 0-match state shows `Ingen regler matchet dette scenariet`
10. Matched rules render as individual cards with clear `Ville ...` wording
11. `Tøm` clears both form and results
12. New dry-run rows appear in `Utførelseslogg`
13. Failure banner count remains unchanged by dry-run activity
14. Body styles remain clean during select/popover interactions

## Reply after implementation
Return exactly:
1. File tree under `dryrun/`
2. The `useDryRunMutation` hook
3. The `useApplicantsSearch` hook
4. Confirmation that failure banner count does not include dry_run rows
5. Confirmation of Radix overlay pattern used in this phase
