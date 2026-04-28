## Phase 7 hotfix — DELETE on `applicants` blocked by audit trigger FK

### Problem

`DELETE FROM applicants WHERE id = '...'` fails with FK violation on `recruitment_audit_events.applicant_id`. The AFTER DELETE audit trigger fires and tries to INSERT a new audit row referencing `OLD.id` — but that applicant has just been deleted in the same transaction. `ON DELETE SET NULL` only nulls existing rows; it does not relax the FK check on a brand-new INSERT.

The audit row still uniquely identifies the deleted applicant via `subject_table = 'applicants'`, `subject_id = OLD.id`, `event_type = 'applicants_deleted'`, and the full `old_values` snapshot — so the forward `applicant_id` reference is redundant in this exact case.

### Fix

Single migration: `CREATE OR REPLACE FUNCTION public.recruitment_audit_capture()` with one targeted change inside the per-table resolution block:

```text
IF TG_TABLE_NAME = 'applicants' THEN
  v_org_id     := COALESCE(... , OLD.organization_id);
  v_subject_id := COALESCE(... , OLD.id);
  v_applicant_id := CASE
    WHEN TG_OP = 'DELETE' THEN NULL          -- avoid FK violation
    ELSE v_subject_id
  END;
ELSIF ...
```

Everything else is preserved verbatim:
- Other tables (`applications`, `applicant_notes`, `applicant_files`, `application_events`) continue to set `v_applicant_id` from `OLD.applicant_id` on DELETE — which is fine, because cascaded DELETEs from `applicants` set `applicant_id` to NULL via the existing FK on those child tables OR fire before the parent applicant is gone (depending on cascade order). The existing `recruitment_audit_events.applicant_id_fkey` is `ON DELETE SET NULL`, so even if a cascaded child audit row beats the parent INSERT order, any leftover stale references self-heal.
- INSERT/UPDATE behavior on `applicants` is unchanged.
- All other branches, no-op-update skipping, retention computation, stage-change special case, and the final INSERT remain identical.

### Verification (run after migration applies)

1. `DELETE FROM applicants WHERE id = '1894091d-e235-424e-905b-b355429fadb5';`
2. ```sql
   SELECT event_type, applicant_id, subject_id, old_values->>'first_name' AS first_name
   FROM recruitment_audit_events
   ORDER BY occurred_at DESC
   LIMIT 1;
   ```
   Expect: `applicants_deleted`, `applicant_id = NULL`, `subject_id = 1894091d…`, snapshot present.
3. ```sql
   SELECT count(*) FROM applicants
   WHERE organization_id = (
     SELECT organization_id FROM recruitment_audit_events
     WHERE subject_id = '1894091d-e235-424e-905b-b355429fadb5'
     ORDER BY occurred_at DESC LIMIT 1
   );
   ```
4. Cascade audit verification:
   ```sql
   SELECT subject_table, event_type, applicant_id, subject_id
   FROM recruitment_audit_events
   WHERE occurred_at > now() - interval '5 minutes'
     AND (
       (subject_table = 'applicants' AND subject_id = '1894091d-e235-424e-905b-b355429fadb5')
       OR old_values->>'applicant_id' = '1894091d-e235-424e-905b-b355429fadb5'
     )
   ORDER BY occurred_at;
   ```
   Expect: one `applicants_deleted` row plus any cascaded `applications_deleted` / `applicant_notes_deleted` / `applicant_files_deleted` / `application_events_deleted` rows. Their `applicant_id` may be NULL post-cascade (per existing `ON DELETE SET NULL`), which is acceptable — the deleted applicant is still identifiable via `old_values->>'applicant_id'`.

### Reply after applying

1. Migration applied confirmation.
2. The audit row from query (2).
3. Remaining applicants count from query (3).
4. Cascade audit rows from query (4).

### Files touched

- New migration only. No application code changes.
