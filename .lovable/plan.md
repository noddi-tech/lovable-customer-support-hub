# Add progress feedback to bulk import flow

## Problem

In the `BulkImportDialog`, when the user clicks **"Start import"** on step 2 (Bekreft), the button awaits the `recruitment-bulk-import-execute` edge function before advancing to step 3. During that window — and during the first ~2s of step 3 before the status poll returns — there is no visual indication that anything is happening. The dialog appears frozen.

## Fix

Two small changes to `src/components/dashboard/recruitment/admin/integrations/meta/BulkImportDialog.tsx`:

### 1. Show "Starter…" feedback on the Start import button

While `execute.isPending` is true, show a spinner + "Starter import…" label inside the button so the click is acknowledged immediately.

### 2. Improve step 3's initial loading state

Replace the flat `Skeleton` shown when `status.data` is undefined with a proper "starting" state that includes:
- A spinning loader icon
- Text: "Starter import… henter leads fra Meta"
- An indeterminate-looking progress bar (e.g. `Progress` at a low pulsing value, or `value={undefined}` styling) so the user sees motion

Also render the progress section even before the first status poll resolves — using `dryRun.total_leads_found` as the denominator and 0 as numerator — so the bar appears immediately on entering step 3 instead of after the first poll round-trip.

### 3. (Optional polish) Advance to step 3 optimistically

Currently `setStep(3)` runs only after `execute.mutateAsync` resolves. Switch to optimistic transition: call `setStep(3)` immediately on click, set `bulkImportId` from `dryRun.bulk_import_id`, and fire the execute mutation in the background. If it errors, toast the error and set step back to 2. This way the user sees the progress UI within ~50ms instead of waiting on a network round-trip.

## Technical details

- File: `src/components/dashboard/recruitment/admin/integrations/meta/BulkImportDialog.tsx`
- Use `Loader2` from `lucide-react` (already imported elsewhere in the project) for spinners
- No backend, hook, or type changes required
- No new dependencies

## Out of scope

- Changes to the actual import speed or backend behavior
- Changes to the CSV import progress UI (`ImportProgressStep.tsx`) — already has good feedback
