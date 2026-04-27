# Phase 4 — Stage-move automation orchestration

Wire the automation engine into the kanban drag-end flow. Replace the current "notify by email/SMS/skip" prompt (`MoveStageDialog`) with an automation-aware confirmation dialog that only appears when **external** rules (email, webhook) match. Skips are first-class: they write `overall_status='skipped'` execution rows with optional reason, but never count toward the failure banner.

## Goal

When an agent drags an applicant between stages:

- **No matching rules** → move silently, no modal, no execution rows.
- **Internal rules only** (`assign_to`) → move silently, fire internal rules, log success.
- **External rules present** (`send_email`, `webhook`) → show confirmation modal. User chooses send / skip / cancel.

## Technical plan

### 1. Migration `20260427_phase4_match_and_skip.sql`

a. **`is_external_action_type(action_type text) → boolean`** — pure SQL, returns `true` for `send_email`, `webhook`, `send_sms`; `false` for `assign_to`, `create_task`. Centralizes external/internal classification.

b. **`recruitment_automation_executions.skip_reason text`** — nullable column for the optional skip reason text from the agent.

c. **`match_automation_rules(p_organization_id, p_trigger_type, p_trigger_context) → setof rule_match`** — `SECURITY DEFINER`, scoped to caller's org via membership check. Returns matching active rules (id, name, action_type, action_config, is_external) without enqueuing or executing. Reuses `rule_matches_context`. Used by the client to decide whether to show the modal.

d. **`execute_automation_rules` update** — add new params:
- `p_skip_external boolean default false`
- `p_skip_reason text default null`
- `p_only_rule_ids uuid[] default null` (allows confirm-and-send to target the exact rules surfaced in the modal)

When `p_skip_external=true`, for each matched external rule the function writes an execution row directly with `overall_status='skipped'`, `skip_reason=p_skip_reason`, `action_results=jsonb_build_array(...)` of "would-have" entries — no queue insert, no edge-function call. Internal rules still execute synchronously as today.

### 2. Action metadata (frontend)

`src/components/dashboard/recruitment/admin/rules/actionTypeMetadata.ts` — single source of truth used by both the kanban dialog and rule editor:

```ts
export const EXTERNAL_ACTION_TYPES = new Set(['send_email', 'webhook', 'send_sms']);
export const isExternalAction = (t: string) => EXTERNAL_ACTION_TYPES.has(t);
```

### 3. `useStageMoveAutomation` hook

New file: `src/components/dashboard/recruitment/pipeline/useStageMoveAutomation.ts`. Three internal mutations: `match_automation_rules` RPC, `execute_automation_rules` RPC, existing `move_application_stage` RPC. Exposes:

- `handleStageMove(params)` — called by kanban drag-end. Calls `match_automation_rules`. If zero external rules matched → `Promise.all([moveStage, executeInternal])`, no modal. Otherwise sets `pendingMove` state and the kanban renders the new modal.
- `pendingMove` state (applicationId, fromStageId, toStageId, applicantName, externalRules[], internalRules[], stageName).
- `confirmMoveAndSend(skipReason?)` → executes all matched rules + moves stage.
- `confirmMoveSkipExternal(skipReason?)` → executes with `skip_external=true` + moves stage. Skipped rows logged.
- `cancelMove()` → clears state; kanban handles optimistic revert.

### 4. `StageMoveConfirmDialog`

New file: `src/components/dashboard/recruitment/pipeline/StageMoveConfirmDialog.tsx`. Norwegian UI. Sections:

- Title: `Flytt {applicantName} til {stageName}?`
- "Følgende ekstern kommunikasjon vil sendes" — list each external rule with its action label (Send e-post: 'mal', Webhook → host).
- If internal rules also match: "I tillegg kjører følgende uansett:" — list internal actions.
- Optional `<Textarea>` "Grunn for å hoppe over (valgfritt)" — only used by the skip button.
- Footer buttons: `Avbryt` (cancel), `Flytt uten å sende` (skip), `Flytt og send` (primary).

### 5. `PipelineBoard` integration

Edit `src/components/dashboard/recruitment/pipeline/PipelineBoard.tsx`:
- Replace `MoveStageDialog` import + usage with `useStageMoveAutomation` + `StageMoveConfirmDialog`.
- `handleDragEnd` keeps optimistic update, then calls `handleStageMove({...})` instead of opening the legacy notify dialog.
- Cancel path invalidates query (reverts optimistic).

### 6. Delete `MoveStageDialog`

Remove `src/components/dashboard/recruitment/applicants/MoveStageDialog.tsx` (no other consumers — confirmed via `rg`). Existing `useUpdateApplicationStage` hook is still used inside the new orchestration hook to perform the actual stage move RPC.

### 7. Execution log updates

a. `src/components/dashboard/recruitment/admin/rules/executions/types.ts` — extend `ExecutionStatus` with `'skipped' | 'pending'`. Add `skip_reason` to `AutomationExecution`. Add status meta entry:
```
skipped: { label: 'Hoppet over', className: 'border-amber-300/40 bg-amber-50 text-amber-700' }
```

b. `ExecutionDetailDrawer.tsx` — when `overall_status === 'skipped'`:
- Section heading becomes "Handlinger som ville blitt utført".
- Each action card shows label + grey "Hoppet over" indicator (no success/fail badge).
- Metadata adds `Grunn: {skip_reason ?? 'Ikke oppgitt'}`.
- No retry button.

c. `useFailureCount.ts` — already filters `overall_status='failed'`, so skipped is naturally excluded. Verify no change needed.

### 8. `process-automation-queue` edge function

No code changes. Skip rows are written synchronously in `execute_automation_rules` and never enter the queue, so the worker cannot double-process them. Plan documents this and adds a Deno test asserting the worker rejects/ignores execution ids it didn't claim.

## Files touched

```text
NEW   supabase/migrations/20260427_phase4_match_and_skip.sql
NEW   src/components/dashboard/recruitment/admin/rules/actionTypeMetadata.ts
NEW   src/components/dashboard/recruitment/pipeline/useStageMoveAutomation.ts
NEW   src/components/dashboard/recruitment/pipeline/StageMoveConfirmDialog.tsx
EDIT  src/components/dashboard/recruitment/pipeline/PipelineBoard.tsx
EDIT  src/components/dashboard/recruitment/admin/rules/executions/types.ts
EDIT  src/components/dashboard/recruitment/admin/rules/executions/ExecutionDetailDrawer.tsx
DEL   src/components/dashboard/recruitment/applicants/MoveStageDialog.tsx
```

## Verification

After implementation I will run the 22-point checklist from the request. Headline checks:
- Drag with no rules → silent move, no rows.
- Drag with internal-only rule → silent move, success row.
- Drag with external rule → modal opens; send-path delivers email and logs success; skip-path logs `overall_status='skipped'` with `skip_reason`.
- Skipped rows render with amber "Hoppet over" badge and don't increment failure banner.
- Webhook 4xx/5xx classification (Phase 1.5 fix) verified end-to-end via httpbin/500.
- Optimistic kanban: card moves on drag, reverts on Avbryt, stays on send/skip.
- Body style stays clean across all modal interactions (Radix cleanup verified).

## Reply

After the build I'll respond with: migration contents, `actionTypeMetadata.ts`, full `useStageMoveAutomation.ts`, full `StageMoveConfirmDialog.tsx`, the kanban drag-end diff, confirmation that `MoveStageDialog.tsx` was deleted, confirmation that `process-automation-queue` needed no changes, and confirmation that `useFailureCount` already excludes `'skipped'`.
