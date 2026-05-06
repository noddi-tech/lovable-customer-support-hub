## Diagnosis summary

**Bug 1 (scheduled email not firing): NOT A BUG.**
Cron jobid 16 runs every 5 min and all recent runs succeeded. The email scheduled for 17:47 UTC (19:47 Oslo) was sent at 17:50:02 UTC by the next cron tick (status=`sent`, conversation `be8063c4...` created). The other recent row was cancelled by the user; a third is scheduled for tomorrow. No code change needed — likely the user inspected the row between 17:47 and 17:50 before the next cron cycle, or looked at the cancelled/future row.

**Bug 2 (bulk send_email missing inbox_id): CONFIRMED.**
`RecruitmentApplicants.tsx` only forwards `template_id`. The dialog already collects and passes `inboxId`; the parent drops it.

**Bug 3 (replies to work@noddi.no not appearing): NOT A CODE BUG.**
- MX/SendGrid Inbound Parse for `inbound.noddi.no` works — sister addresses (`hei@`, `bedrift@`) received customer messages today.
- `inbound_routes` row exists for `work@noddi.no` → `work@inbound.noddi.no` → recruitment inbox.
- `sendgrid-inbound` has zero recent invocations and there are zero customer-type messages for the recruitment inbox.
- Per the Inbound Pipeline memory (Google Group → SendGrid MX → Edge Function), the missing piece is the Google Group `work@noddi.no` not being configured to forward to `work@inbound.noddi.no`. This is a Google Workspace config the admin must do (add `work@inbound.noddi.no` as an external member of the group), same as was done for `hei@`, `bedrift@`, `tronderdekk@`.

## Code change (Bug 2 only)

**File:** `src/components/dashboard/recruitment/applicants/RecruitmentApplicants.tsx`

Update `SendEmailBulkDialog.onConfirm`:
```tsx
onConfirm={(template_id, inbox_id) =>
  runBulk('send_email', { template_id, inbox_id })}
```

That's the only file touched. `BulkActionPayload.inbox_id` already exists; the bulk-applicant-action edge function already validates it (returns the 400 we saw).

## Action items for user (no code)

1. **Bug 1**: None — system worked. Re-test by waiting at least one full 5-min cron tick past `scheduled_for` before checking status.
2. **Bug 3**: In Google Workspace admin, open the `work@noddi.no` group and add `work@inbound.noddi.no` as an allowed external member (mirror the setup of `hei@noddi.no`). After that, send a test email from Gmail to `work@noddi.no` and confirm `sendgrid-inbound` logs a hit and a customer message appears in the recruitment inbox.

## Verification after Bug 2 fix

- Open recruitment applicants list, select 2+ applicants, choose "Send e-post", pick inbox + template, confirm.
- Expect success toast and rows in `recruitment_scheduled_emails` (or sent messages) for each recipient with the correct `inbox_id`.
