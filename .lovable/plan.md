# Phase B6 — Recruitment Email Integration

## Status
- [x] **Step 1: Migration applied.** `inboxes.purpose`, `conversations.conversation_type`+`applicant_id`, `profiles.email_display_name`, `organizations.default_attachment_expiry_days`, `recruitment_scheduled_emails` table with RLS, indexes, `update_updated_at_column` trigger.
- [x] **Cron registered.** `recruitment-process-scheduled-emails` every 5 min — jobid surfaced via `RAISE NOTICE` (also visible: `SELECT jobid FROM cron.job WHERE jobname='recruitment-process-scheduled-emails'`). No collision with existing crons (auto-close `*/10`, sla `*/15`, snooze `* *`, gmail `*/5 sec`, evaluate-conversations `0 2`, meta-token `30 2`, recruitment-audit-cleanup `15 3`).
- [ ] **Step 2:** Extract `_shared/sendOutboundEmail.ts` from `send-reply-email`, then redeploy `send-reply-email` (per B3 lesson — shared imports don't auto-redeploy).
- [ ] **Step 3:** Build `send-recruitment-email`, `process-scheduled-emails`, `attach-conversation-to-applicant`, `detach-conversation-from-applicant`. Audit events for both attach/detach use `event_category='write'` (per memory #6 — semantic meaning is in `event_type`).
- [ ] **Step 4:** Modify `sendgrid-inbound` for purpose-aware `conversation_type` + auto-link by lower(email).
- [ ] **Step 5:** Inbox admin form — purpose select.
- [ ] **Step 6:** Inbox listing — `Alle | Kundesupport | Rekruttering` filter chip + recruitment context strip on conversation cards + manual attach CTA.
- [ ] **Step 7:** Applicant profile email tab + compose dialog (template / free-form, attachments via signed URLs from `applicant_files`, schedule).
- [ ] **Step 8:** Recruiter `email_display_name` settings field.
- [ ] **Step 9:** Wire bulk `send_email` action to `send-recruitment-email` when recruitment context.
- [ ] **Step 10:** Verification matrix §11 walked end-to-end. `bun tsc --noEmit` clean.

## Notes
- Out of scope per spec §13.
- 99.9% uptime: `sendgrid-inbound` change is additive — support path untouched, recruitment branch only fires when `inbox.purpose='recruitment'`.
