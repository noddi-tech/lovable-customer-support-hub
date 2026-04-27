## Phase 1.5 Engine Cleanup — Three Targeted Fixes

Fix three precise bugs in the recruitment automation engine: shape mismatch (`action_results` should always be an array), broken recipient resolution in dry-run when only `applicant_id` is in trigger context, and webhook target HTTP errors silently misclassified as success.

### What changes

#### 1. New migration: `supabase/migrations/<ts>_phase_15_engine_fixes.sql`

Replace `public.dispatch_action(...)` with the dry-run-only version supplied in the spec:

- Hard-fails if called with `p_dry_run = false` (real runs must go through the edge worker now).
- Returns `jsonb_build_array(jsonb_build_object(...))` for every branch — array-shaped, one element per action, each tagged with `action_type`.
- `send_email`: looks up recipient via `application_id` first, falls back to `applicant_id`; also resolves applicant name; sets `success = false` when no email is found and surfaces a Norwegian error (`'Søker har ingen e-postadresse'`).
- `assign_to`: looks up profile, returns `assigned_to_name`, success = `FOUND`.
- `webhook`: returns URL + method + success based on URL presence.
- `send_sms` / `create_task`: raise (not implemented in v1).
- All error strings in Norwegian for UI consistency.
- Uses `simulated: true` inside the array element (execution-level `is_dry_run` column unchanged).

#### 2. `supabase/functions/process-automation-queue/index.ts`

**A. `dispatchWebhook` — parse the inner JSON body**

Replace the current return block. The wrapper `fetch` to `dispatch-webhook` always returns 200 unless the dispatcher itself crashed; the actual target HTTP status, success, and error live inside the JSON body. Parse `bodyText` as JSON and propagate `inner.success`, `inner.http_status`, `inner.response_excerpt`, `inner.error`. Fall back to a synthetic failure result if JSON parsing throws.

**B. Wrap `result` in array with `action_type` before `finalize_queue_row`**

In the main handler, after `const result = await dispatch(...)`:

```ts
const actionResults = [{ action_type: actionType, ...result }];
```

Pass `actionResults` (not `result`) as `p_action_results` to the `finalize_queue_row` RPC. Real-run rows now match the array shape of dry-run rows.

#### 3. `src/components/dashboard/recruitment/admin/rules/dryrun/DryRunResultCard.tsx`

Remove the Phase-4 defensive single-object `preview` branch — it becomes dead code once the engine always returns arrays:

- Delete `NormalizedDryRun`, `normalizeActionResults`, and `translatePreview` helpers.
- Replace with simple `const actions: DryRunActionResult[] = Array.isArray(result.action_results) ? result.action_results : [];`.
- Render: empty-state when `actions.length === 0`, else map over `actions` (the existing per-action card markup is kept verbatim).
- Remove the entire `kind === 'preview'` JSX block and the now-unused `Separator` usage tied to it (kept where still needed inside the actions branch).

`ExecutionDetailDrawer.tsx` already iterates `action_results` as an array — no change needed there; it will now render real action data for both dry-run and real executions.

### Deployment

1. Apply migration via the migration tool (auto-prompts user approval).
2. Deploy `process-automation-queue` edge function.
3. UI change ships with the next build.

### Verification

- Run the SQL `execute_automation_rules('stage_entered', { applicant_id, to_stage_id: 'qualified', organization_id }, true)` from the spec → expect `action_results` to be a one-element array with `action_type: 'send_email'`, real `recipient` (e.g. `test@test.no`), `recipient_name`, `template_name`, `subject_preview`, `simulated: true`, `success: true`.
- Reload `/admin/recruitment?tab=automation&subtab=dry-run`, run a dry-run via the form → `DryRunResultCard` shows real recipient + template metadata, no `<ingen e-post>`, no raw English preview string.
- Old dry-run rows already in DB (single-object shape) will now show the empty-state ("Ingen handlinger ble simulert"). Acceptable per spec — historical rows are not migrated.
- TypeScript compiles cleanly (`npx tsc --noEmit`).
- Webhook real-run misclassification fix: code-review only this phase; live verification deferred to Phase 5 when kanban triggers real runs.

### Reply after implementation

1. The new migration filename + dispatch_action SQL
2. Updated `dispatchWebhook` function body
3. Updated handler block showing `actionResults` wrapping + finalize call
4. `DryRunResultCard.tsx` cleanup diff
5. TypeScript compile confirmation
