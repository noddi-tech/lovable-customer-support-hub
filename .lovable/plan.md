# Phase 5b — Recruitment automation polish

Four independent improvements: resolve UUIDs to human names, capture "would-have" context on skip, surface rule counts on dry-run, and verify structured dry-run rendering.

## Item 1 — Resolve UUIDs in StageMoveConfirmDialog

**Problem:** When `action_config` only stores IDs (`template_id`, `user_id`), the modal shows raw UUIDs ("Send e-post: 'f600217f…'", "Tildel til 55194f13…").

**Fix in `src/components/dashboard/recruitment/pipeline/useStageMoveAutomation.ts`:**
- Extend `MatchedRule` with optional `template_name` and `user_name` fields.
- After `matchRulesRpc(ctx)` in `handleStageMove`, collect distinct `template_id`s (from `send_email` rules) and `user_id`s (from `assign_to` rules), run two parallel queries:
  - `recruitment_email_templates` → `select('id, name').in('id', templateIds)`
  - `profiles` → `select('id, full_name, email').in('id', userIds)`
- Build maps and produce `enrichedMatched` with resolved names attached. Split that into `externalRules` / `internalRules`.

**Fix in `src/components/dashboard/recruitment/pipeline/StageMoveConfirmDialog.tsx`:**
- Update `describeAction`:
  - `send_email` → use `rule.template_name`; fall back to plain `'Send e-post'` (no UUID).
  - `assign_to` → use `rule.user_name`; fall back to `'Tildel ansvarlig'`.

## Item 2 — Capture "would-have" context on skip

**Problem:** Skipped executions log only `{skipped, skip_reason, action_type}` so the detail drawer shows URL/HTTP/Respons as "—".

**New migration `supabase/migrations/<ts>_phase_5b_skip_context.sql`:**
- Recreate `execute_automation_rules` (same signature) replacing the skip-array build with action-type-aware JSONB:
  - `send_email`: `template_id`, `would_send_to_application_id`
  - `webhook`: `url`, `method` (default `POST`)
  - `send_sms`: `phone_template_id`
  - All include `action_type`, `skipped:true`, `skip_reason`, `success:null`.
- Keep the row-level `skip_reason` column for fast filtering. No backfill of legacy rows.

**Fix in `src/components/dashboard/recruitment/admin/rules/executions/types.ts`:**
- Extend `ActionResultItem` with optional `method`, `would_send_to_application_id`, `phone_template_id`.

**Fix in `src/components/dashboard/recruitment/admin/rules/executions/ExecutionDetailDrawer.tsx`:**
- When `execution.overall_status === 'skipped'` (or `action.skipped === true`), render an alternate `DetailGrid` per action type using the configured fields:
  - `webhook` → `Ville kalt URL`, `Metode`
  - `send_email` → `Mal` (resolved from `template_id`), `Mottaker` (applicant email if available)
  - `assign_to` → `Ville tildelt` (resolved name)
- Add a small `useQuery` inside the drawer to resolve `template_name` (from `recruitment_email_templates`) and `user_name` (from `profiles`) for the IDs present in `action_results` when the drawer opens.
- Legacy skipped rows fall back to "—" gracefully.

## Item 3 — Rule count next to trigger types in dry-run picker

**New hook `src/components/dashboard/recruitment/admin/rules/dryrun/hooks/useRuleCountByTrigger.ts`:**
- Query `recruitment_automation_rules` filtered by current organization and `is_active=true`, group counts by `trigger_type`. Returns `Record<string, number>`. `staleTime: 30_000`.

**Fix in `src/components/dashboard/recruitment/admin/rules/dryrun/DryRunForm.tsx`:**
- Use the hook and append `(N regel | regler)` to each `SelectItem` label. Norwegian pluralization: `1 → 'regel'`, else `'regler'`.

## Item 4 — Verify structured dispatch_action rendering

`DryRunResultCard.tsx` already reads from structured fields (`recipient`, `template_name`, `url`, `method`). Will run `rg "\.preview" src/components/dashboard/recruitment` to confirm no string-concat code paths remain. Expected outcome: **no fix needed**, just confirmation in reply. If anything turns up, replace with structured field reads using `getActionLabel` from `executions/types.ts`.

## Files

**New:**
- `supabase/migrations/<ts>_phase_5b_skip_context.sql`
- `src/components/dashboard/recruitment/admin/rules/dryrun/hooks/useRuleCountByTrigger.ts`

**Edit:**
- `src/components/dashboard/recruitment/pipeline/useStageMoveAutomation.ts`
- `src/components/dashboard/recruitment/pipeline/StageMoveConfirmDialog.tsx`
- `src/components/dashboard/recruitment/admin/rules/executions/ExecutionDetailDrawer.tsx`
- `src/components/dashboard/recruitment/admin/rules/executions/types.ts`
- `src/components/dashboard/recruitment/admin/rules/dryrun/DryRunForm.tsx`

## Out of scope

- No engine schema changes beyond skip-context capture.
- No new pages/RPCs.
- No multi-action support.
- No backfill of pre-Phase-5b skipped rows.

## Verification

Will run the 8-check list from the request after implementation, then `npx tsc --noEmit` to confirm clean compile.
