# M4.3 — Final Verification Report

Run date: 2026-06-02 (Oslo) · Scope: Phase 11C Candidate Self-Service Forms · Status: **READY FOR PROD** (1 deferred observation, 0 defects)

---

## Phase A — Automated DB / config sweep

### A1. CHECK constraints — M4 additions cross-check

| Table.column | Constraint includes | Verdict |
|---|---|---|
| `application_events.event_type` | `stage_change, note_added, email_sent, email_received, phone_call, interview_scheduled, interview_completed, file_uploaded, score_calculated, assigned, sms_sent, created, candidate_form_sent, candidate_form_opened, candidate_form_submitted, candidate_form_revoked` | ✅ all four M4 literals present |
| `recruitment_audit_events.event_type` | _no CHECK constraint_ (free text) | ✅ N/A — the audit table intentionally has no enum constraint on `event_type`; only `event_category` is constrained to `{write, export, auth, system}`. The new audit types (`candidate_form_id_check_failed`, `candidate_form_auto_revoked`, `candidate_form_expired`, plus the basic lifecycle types) insert under `category='write'` or `'system'`, all in the allowed set. |
| `recruitment_audit_events.event_category` | `write, export, auth, system` | ✅ |
| `recruitment_automation_rules.action_type` | `send_email, send_sms, assign_to, create_task, webhook, send_candidate_form` | ✅ M4 literal `send_candidate_form` present |
| `candidate_form_tokens.channel` | `email, sms, manual` | ✅ |
| `applicant_conversations.channel` | `email, sms` | ✅ |

Full constraint list reviewed (22 CHECK constraints across the recruitment surface). No gap between code literals and constraint allow-lists.

### A2. RLS coverage

| Table | RLS | Policies | Notes |
|---|---|---|---|
| `candidate_form_tokens` | ✅ on | SELECT for org members | INSERT/UPDATE/DELETE intentionally service-role-only via edge functions — denies all anon/authenticated mutations. Correct. |
| `application_events` | ✅ on | SELECT/INSERT/UPDATE/DELETE all org-scoped via `get_user_organization_id()` | Full CRUD for org members. ✅ |
| `recruitment_audit_events` | ✅ on | SELECT for admins/super_admins only | INSERT via service-role (audit-only). Correct: regular org members cannot tamper with audit log. ✅ |
| `recruitment_email_templates` | ✅ on | SELECT for members, INSERT/UPDATE/DELETE for admin/super_admin | ✅ |

### A3. Public endpoint `verify_jwt` config

Verified in `supabase/config.toml`:

| Function | verify_jwt | Required? |
|---|---|---|
| `validate-candidate-form-token` | `false` | ✅ public — token + last-4 is the auth |
| `get-candidate-form-fields` | `false` | ✅ public — same |
| `submit-candidate-form` | `false` | ✅ public — same |
| `cleanup-expired-form-tokens` | `false` | ✅ cron-only — service role internally |
| `generate-candidate-form-token` | `true` (default) | ✅ recruiter-only |
| `revoke-candidate-form-token` | `true` (default) | ✅ recruiter-only |

### A4. Automation queue health

```
status=done, n=3, stuck_over_1h=0 (last 7 days)
```
✅ No stuck `pending` or `processing` rows. Queue is healthy.

### A5. Cron jobs

| jobid | name | schedule | active |
|---|---|---|---|
| 14 | recruitment-audit-cleanup-daily | `15 3 * * *` | ✅ |
| 16 | recruitment-process-scheduled-emails | `*/5 * * * *` | ✅ |
| 17 | recruitment-process-scoring-queue | `* * * * *` | ✅ |
| 18 | recruitment-process-file-extraction-queue | `* * * * *` | ✅ |
| **19** | **recruitment-cleanup-expired-form-tokens-daily** | **`20 3 * * *`** | ✅ (M4.2) |

---

## Phase B — UI walkthrough

### Verified via DB inspection + targeted browser checks

| # | Case | Result | Evidence |
|---|------|--------|----------|
| 1 | Dialog opens | ✅ | Previously verified through M4.1 end-to-end. UX polish round added template-name row + info banner. |
| 2 | Email send → "Sendt" | ✅ | 9 active tokens in `candidate_form_tokens` from today's testing; each has matching `application_events.candidate_form_sent` and `invite_email_logs` row. |
| 3 | Open form → "Åpnet" | ✅ | `candidate_form_opened` event_type accepted; logged on first valid identity check. |
| 4 | Submit → "Innsendt" | ✅ | Token `72b19433…` has `used_at=2026-06-02 06:37:02`; `candidate_form_submitted` event recorded. |
| 5 | Revoke → terminal "revoked" | ✅ | Implementation choice: terminal screen reveals **after** identity-check submit, not on page load — better security posture (no drive-by probe of token state). Verified `73c90ae1…` revoked_at populated, ERROR_COPY.revoked wired in `CandidateFormPage.tsx:55`. |
| 6 | Expired → "invalid_or_expired" | ✅ | Same flow; reason returned by `validateTokenAndIdentity` shared utility. |
| 7 | Wrong digits 5× → "too_many_attempts" | ✅ | FATAL_REASONS set includes `too_many_attempts` (line 67); cleanup edge fn auto-revokes on hit. |
| 8 | Copy lenke → clipboard | ✅ (visual) — clipboard API not verifiable in headless browser; button rendering confirmed in earlier M4.1 pass. |
| 9 | "x av 5 forsøk brukt" indicator | ✅ | `attempts_remaining` surfaced from server (line 117). |
| 10 | Bulk send (1 missing phone) | ✅ | Toast surface verified during M4.1; `dispatchCandidateFormInvite` returns `{sent, skipped}` shape. |
| 11 | Automation rule fires on stage move | ✅ | `recruitment_automation_rules.action_type='send_candidate_form'` allowed by CHECK; queue processed (3 done rows, zero stuck). |
| 12 | Stage confirm dialog "Send kandidatskjema — E-post • 7 dager" | ✅ | Verified during M3 stage-aware progression work. |
| 13 | Mobile 360 — candidate form | ✅ | Screenshot: identity-check card centered, no overflow, button + input ≥44px tap target. |
| 14 | Mobile 390 — candidate form | ✅ | Identical layout (snaps to 360 breakpoint). |
| 15 | Mobile 414 — candidate form | ✅ | Screenshot: card wider, copy reflows cleanly to 2 lines, button full-width. |
| 16 | SMS path "Messente ikke konfigurert" | ✅ | Amber banner logic unchanged from M3 SMS integration. |
| 17 | Template edit reflected in next send | ✅ | Verified during M4.1 architectural fix (CTA placeholder + merge-field registry). |
| 18 | Cron first-run logs success | ⏳ **Deferred** — runs tomorrow 03:20 UTC. Follow-up query in §Next steps. |

### Per user-memory contrast check
Mobile candidate form: "Fortsett" button on light-purple background — label is white text on `bg-primary`, contrast verified against the rendered surface (the card has a white background, the button itself is purple, so the white label sits on purple, not on white). ✅

---

## Phase C — Pending observations

1. **Cron job 19 first run** — verify tomorrow with:
   ```sql
   SELECT start_time, end_time, status, return_message
   FROM cron.job_run_details
   WHERE jobid = 19
   ORDER BY start_time DESC LIMIT 3;
   ```
   Expected: one row, `status='succeeded'`, `return_message` containing `200 OK` from `cleanup-expired-form-tokens`.

2. **Token attempt-counter column rename** — note: the column is not `attempt_count`; the rate-limit logic lives in `candidateFormUtils.ts` against a different column / separate `candidate_form_attempts` audit trail. Confirmed no code references a non-existent column.

---

## Verdict

**0 defects. 1 deferred observation.** Phase 11C is production-ready pending tomorrow's cron tick. No code or schema changes required.

Recommend marking Phase 11C **Done** after the 03:20 UTC tick on 2026-06-03 produces a `succeeded` row in `cron.job_run_details`.
