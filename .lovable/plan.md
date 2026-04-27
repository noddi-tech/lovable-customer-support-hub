# Phase 8 — Applicant Edit UI

Closes the missing edit gap from Phase 7. All edits flow through Phase 7's audit triggers automatically; no manual audit logging in mutations.

## Discovery confirmations

- `applicants` schema matches spec: all 17 listed fields exist (incl. `gdpr_consent_at`, `external_id`, `source_details`, `metadata`).
- `applicant_notes` has `updated_at` → UPDATE/DELETE will be audit-captured.
- `applicant_files` has NO `updated_at` → reclassify UPDATE will succeed but won't trigger audit (acceptable per spec; DELETE is captured).
- Existing files confirmed at `src/components/dashboard/recruitment/applicants/`: `ApplicantProfile.tsx`, `ApplicantInfoCard.tsx`, `ApplicantNotesTab.tsx`, `ApplicantFilesTab.tsx`, `CreateApplicantDialog.tsx`, `useApplicantProfile.ts`.
- `CreateApplicantDialog` uses plain `useState` — staying as-is. New `EditApplicantDialog` introduces RHF+zod (one-time pattern migration for applicant code).
- Source options in existing dialog: `manual / referral / website / finn` (will extend to include `csv_import / meta_lead_ad / other` for editing parity).

## Files to create

### Hooks (`applicants/hooks/`)
- `useUpdateApplicant.ts` — `UPDATE applicants`; maps Postgres `23505` email conflict → `EMAIL_CONFLICT` error; invalidates `['applicant', id]`, `['applicants']`, `['recruitment-audit-events']`.
- `useUpdateApplicantNote.ts` — UPDATE on `applicant_notes` + insert `application_events` row with `event_type='note_edited'`.
- `useDeleteApplicantNote.ts` — DELETE on `applicant_notes` + insert `application_events` `event_type='note_deleted'`.
- `useDeleteApplicantFile.ts` — Storage `.remove([storage_path])` first; if OK, DELETE row; insert `application_events` `event_type='file_deleted'` with `file_name` in `event_data`. On storage failure: surface toast, abort (prefer orphan storage over orphan row).
- `useReclassifyApplicantFile.ts` — UPDATE `file_type` on `applicant_files`; invalidate files cache.

### Edit dialogs (`applicants/edit/`)
- `schema.ts` — zod schema for editable applicant fields (introduces RHF+zod pattern to applicant code).
- `EditApplicantDialog.tsx` — RHF+zod, all editable fields, 2-column grid, sections: Kontaktinfo / Kvalifikasjoner / Tilgjengelighet / GDPR. Read-only fields shown as muted display.
- `GDPRRevocationDialog.tsx` — Typed-confirmation pattern, exact match `"I forstår at samtykke trekkes"` to enable Save. On confirm: `gdpr_consent=false`, `gdpr_consent_at=null`.
- `SourceChangeWarningDialog.tsx` — Warning with from→to display + "Endre kilde" / "Avbryt".

### Inline edit (`applicants/inline/`)
- `InlineEditField.tsx` — Reusable controlled input (text/number/date/select/multiselect). Enter/blur saves, Esc cancels, "Lagrer…" indicator while pending, revert on error.
- `InlineEditableRow.tsx` — Hover reveals pencil icon; click swaps row to edit mode. Intercepts `source` (→ SourceChangeWarningDialog) and `gdpr_consent` true→false (→ GDPRRevocationDialog) before save.

### Notes (`applicants/notes/`)
- `EditNoteDialog.tsx` — Textarea + `note_type` select prefilled.
- `DeleteNoteConfirmDialog.tsx` — AlertDialog confirm.

### Files (`applicants/files/`)
- `DeleteFileConfirmDialog.tsx` — AlertDialog with file name displayed.
- `ReclassifyFileDialog.tsx` — Select for new `file_type` (cv / cover_letter / certificate / id_doc / other).

## Files to modify

- `ApplicantProfile.tsx` — Add "Rediger søker" button in header; mount `EditApplicantDialog` at parent level (state: `editDialogOpen`).
- `ApplicantInfoCard.tsx` — Wrap editable rows in `InlineEditableRow`. Static rows: `external_id`, `source_details`, `created_at`, `updated_at`, `id`, `organization_id`.
- `ApplicantNotesTab.tsx` — Per-note hover Edit/Delete actions; mount `EditNoteDialog` + `DeleteNoteConfirmDialog` at parent level with `selectedNote` state.
- `ApplicantFilesTab.tsx` — Per-file `DropdownMenu` (Last ned / Endre type / Slett); use `modal={false}` on DropdownMenu (Phase 2 lesson); mount `ReclassifyFileDialog` + `DeleteFileConfirmDialog` at parent level.

## Landmine handling

| Landmine | Handling |
|---|---|
| Email uniqueness (23505) | Catch in `useUpdateApplicant`, throw `EMAIL_CONFLICT`, dialog/inline shows toast `"E-post er allerede i bruk på en annen søker"` |
| Source change | `InlineEditableRow` and `EditApplicantDialog` intercept submit when `source` differs → `SourceChangeWarningDialog` → confirm proceeds |
| GDPR true→false | Intercept toggle/submit → `GDPRRevocationDialog` typed-confirmation → save sets `gdpr_consent_at=null` |
| `applicant_files` reclassify not audit-captured | Accepted; metadata-only change |
| Storage delete failure | Toast error, do NOT delete DB row |

## Stability rules applied

- All dialogs mounted at parent level (Phase 2 regression lesson).
- DropdownMenu in `ApplicantFilesTab` uses `modal={false}`.
- All applicant mutations invalidate `['recruitment-audit-events']` so Tab 5 timeline reflects changes.
- Inline edit uses controlled-input pattern (RHF overkill for single-field edits).
- `CreateApplicantDialog` not refactored (separate cleanup later).

## Verification (post-implementation)

Run through 17-point checklist from spec:
1–8: EditApplicantDialog flow (open, edit phone, save, audit captured, source change warning, validation disabled save, email conflict toast).
9–12: Inline edit (hover pencil, click→edit, Enter saves, Esc cancels).
13–15: GDPR revocation (typed confirm, exact match, consent_at cleared, audit captured).
16–17: Notes edit/delete; Files reclassify/delete (storage + DB).
Body style regression: open/close every dialog, verify no stuck `pointer-events: none`.

`npx tsc --noEmit` must pass clean.

## Reply after implementation

1. New files list
2. Modified files list
3. Full code: `EditApplicantDialog.tsx`
4. Full code: `GDPRRevocationDialog.tsx`
5. Full code: `useUpdateApplicant.ts`
6. TypeScript clean confirmation
7. Confirmation all dialogs parent-mounted
8. Confirmation `modal={false}` on files DropdownMenu
