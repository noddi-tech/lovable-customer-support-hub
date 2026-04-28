# Phase 8 Polish — Three Fixes

## FIX A — Success toast on useUpdateApplicant

**File:** `src/components/dashboard/recruitment/applicants/hooks/useUpdateApplicant.ts`

Add `toast.success('Søker oppdatert')` to the existing `onSuccess` handler (after the three `invalidateQueries` calls). One-line change for parity with the note/file mutation hooks.

## FIX B — Visible save/cancel buttons in InlineEditField

**File:** `src/components/dashboard/recruitment/applicants/inline/InlineEditField.tsx`

For `text` / `number` / `date` inputs, append two ghost icon buttons (`h-8 w-8`) next to the input:
- `Check` icon → calls existing `commit()`
- `X` icon → calls existing `onCancel()`
- Wrapped in `Tooltip` with "Lagre" / "Avbryt"

While `isPending`, replace BOTH buttons with a single `Loader2` spinner (drop the inline "Lagrer…" text since the spinner replaces the icons).

The blur-to-save behavior needs care: if the user clicks the ✕ button, the input's `onBlur` will fire first and trigger `commit()`. Mitigation: add `onMouseDown={(e) => e.preventDefault()}` to the cancel button so blur doesn't fire before click — this is the standard pattern.

`select` type: unchanged (auto-saves on selection).
Imports added: `Check, X` from `lucide-react`; `Button` from `@/components/ui/button`; `Tooltip, TooltipContent, TooltipTrigger, TooltipProvider` from `@/components/ui/tooltip`.

## FIX C — Translated diff renderer in audit drawer

### New: `src/components/dashboard/recruitment/admin/audit/utils/fieldLabels.ts`

`FIELD_LABELS` map (Norwegian) covering applicants, applications, applicant_notes, applicant_files, application_events, and common system columns. Exports `fieldLabel(key)` returning the label or the raw key as fallback.

### New: `src/components/dashboard/recruitment/admin/audit/utils/valueFormatters.ts`

Exports `FormatContext` (with optional `userMap`, `stageMap`, `positionMap`) and `formatValue(fieldName, value, ctx?)`. Type-aware rendering:
- `null/undefined` → "Ikke oppgitt"
- UUID fields (`assigned_to`, `uploaded_by`, `performed_by`, `author_id`) → looked up via `ctx.userMap`, fallback to truncated UUID
- Enums: `current_stage_id`, `source`, `language_norwegian`, `work_permit_status`, `note_type`, `file_type` → Norwegian labels
- Booleans → "Ja"/"Nei"
- Date fields → `toLocaleDateString('nb-NO', { day, month: 'long', year })`
- `file_size` numbers → B/KB/MB
- Arrays → comma-joined or "Ingen"
- Objects → `JSON.stringify`
- Else → `String(value)`

### New: `src/components/dashboard/recruitment/admin/audit/utils/diffRenderer.tsx`

Exports `<DiffRenderer oldValues newValues ctx />`. Iterates the union of keys from both objects.

For each key, picks layout based on a "long" threshold:
- Long if formatted output > 40 chars, array length > 3, or value is a non-array object → side-by-side cards (red/emerald) with "Før" / "Etter" labels
- Otherwise → single line: `Label: oldStr → newStr` with strike-through on old value

Empty case → "Ingen endringer."

### Modify: `src/components/dashboard/recruitment/admin/audit/timeline/AuditEventDetailDrawer.tsx`

1. Collect all UUIDs needing name lookup from the event:
   - `event.actor_profile_id`
   - From `old_values` and `new_values`: any `assigned_to`, `uploaded_by`, `performed_by`, `author_id` values
2. Use `useQuery(['audit-actor-names', uuids])` to fetch from `profiles` (`select id, full_name`) → build `userMap: Map<string, string>`. Skip query when no UUIDs.
3. Replace the two raw `<pre>` blocks for `old_values`/`new_values` with a single `<DiffRenderer oldValues={event.old_values} newValues={event.new_values} ctx={{ userMap }} />`.
4. For `event.event_category === 'export'`: render `event.context` as labeled rows (Format / Antall hendelser / Datointervall) — NOT through DiffRenderer. Keep raw context `<pre>` only as fallback when shape is unknown.
5. Aktør-profil row: when `userMap` has the actor's name, show the name as the visible value with the UUID inside a `Tooltip` for forensics. Falls back to UUID when not resolved.
6. Other metadata rows (Hendelse-ID, Tabell, Subjekt-ID, Søker-ID) unchanged.

## Verification

- `npx tsc --noEmit` clean
- Spot checks P1–P5 from request: success toast, ✓/✕ buttons + spinner, translated diff lines, multi-field edit, array side-by-side rendering, and edge cases (boolean, null→value, date, stage change)

## Reply contents

1. `useUpdateApplicant.ts` diff
2. Full new `InlineEditField.tsx`
3. New `fieldLabels.ts`
4. New `valueFormatters.ts`
5. New `diffRenderer.tsx`
6. Full new `AuditEventDetailDrawer.tsx`
7. TypeScript clean confirmation
