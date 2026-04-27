# Phase 6 — Tab 4 Integrasjoner (Phase A + B)

Build the Integrasjoner admin tab as a unified hub with three sections plus an observability log. Lead-kilder is fully functional; Utgående and Autentisering render real "Kommer snart" cards. Lays the schema/UI foundation for the Meta Lead Ads webhook handler shipping in Phase C.

## Schema migration

File: `supabase/migrations/<ts>_phase_6_integrations_foundation.sql`

1. **`recruitment_meta_integrations`** — per-org Meta page connection (page_id, page_name, page_access_token, verify_token, status enum, last_event_at, audit cols). UNIQUE(org, page_id). RLS: org admins/super_admins via `organization_memberships`.
2. **`recruitment_meta_form_mappings`** — form_id → position_id mappings under an integration. UNIQUE(integration_id, form_id). Same RLS.
3. **`recruitment_lead_ingestion_log`** — observability for all inbound leads (source, external_id, status, applicant_id, error_message, raw_payload). RLS SELECT for org admins; INSERT only by service role.
4. **`applicants.external_id`** column + partial UNIQUE index `(organization_id, external_id) WHERE external_id IS NOT NULL` for dedup.
5. **`applicants_source_check` constraint** — verified existing constraint is missing `'other'`. Migration will `DROP` and re-`ADD` with the full enum: `manual, csv_import, meta_lead_ad, finn, website, referral, other`.
6. **Backfill**: `UPDATE applicants SET source_details = metadata, metadata = '{}'::jsonb WHERE source != 'manual' AND metadata IS NOT NULL AND metadata != '{}' AND (source_details IS NULL OR source_details = '{}')`.
7. `updated_at` triggers on the two new mutable tables (reuse existing `update_updated_at_column()`).

Note on access token: stored plain in row, RLS-restricted. Encryption-at-rest deferred to Phase D — no pgsodium/vault tonight.

## Code changes

### Modify
- **`src/pages/admin/RecruitmentAdmin.tsx`** — replace `<PlaceholderTab>` for `tab='integrations'` with `<IntegrationsTab />`.
- **`src/components/dashboard/recruitment/import/useImport.ts`** — change applicant INSERT to write `source_details: row.metadata` instead of `metadata: row.metadata` (keep metadata unset/empty).

### Create (under `src/components/dashboard/recruitment/admin/integrations/`)

```text
integrations/
  IntegrationsTab.tsx               // header + 3 sections + log panel
  types.ts                          // MetaIntegration, FormMapping, LeadIngestionLogEntry
  sections/
    LeadSourcesSection.tsx          // CSV + Meta + Finn (coming soon)
    OutboundSection.tsx             // Slack, Teams, Calendar, ATS — coming soon
    AuthenticationSection.tsx       // Google SSO, Entra ID — coming soon
  cards/
    CSVImportCard.tsx               // stats + link to /recruitment/import
    MetaLeadAdsCard.tsx             // 2 states (not configured / configured)
    ComingSoonCard.tsx              // reusable placeholder
  meta/
    MetaConnectionDialog.tsx        // create/edit; webhook URL + verify_token display
    MetaFormMappingDialog.tsx       // CRUD form_id↔position mappings
  log/
    LeadIngestionLogPanel.tsx       // paginated table, empty state
    LeadIngestionLogRow.tsx
  hooks/
    useMetaIntegration.ts           // refetchOnMount: 'always'
    useFormPositionMappings.ts
    useLeadIngestionLog.ts          // refetchOnMount: 'always', staleTime 30s
```

## UI behaviour highlights

- **CSVImportCard**: shows count of `applicants` where `source IN ('csv_import','meta_lead_ad')` and most-recent `created_at`. Button navigates to existing `/recruitment/import` wizard.
- **MetaLeadAdsCard**:
  - No row → "Ikke koblet" + "+ Koble til Meta-side".
  - Row exists → status badge maps `configured`→amber "Klar for kobling", `connected`→green, `disconnected`→gray, `error`→red. Stats from ingestion log. Buttons: "Administrer skjemaer", "Vis tilkoblingsdetaljer".
- **MetaConnectionDialog**: Sheet (right slide), parent-mounted. Fields: page_name, page_id (numeric), page_access_token (masked), read-only webhook URL `${SUPABASE_URL}/functions/v1/meta-lead-webhook`, read-only verify_token (UUID generated client-side on first save, "Regenerer" button). Norwegian collapsible setup instructions for Meta Developer Portal.
- **MetaFormMappingDialog**: Sheet, parent-mounted. List of mappings; each row editable form_name/form_id/position select (open positions only)/active toggle/delete. "+ Legg til skjema".
- **LeadIngestionLogPanel**: Table (Kilde, Status, Søker, Tidspunkt, Feilmelding). 50/page pagination. Empty state copy: "Ingen leads mottatt ennå. Når Meta Lead Ads er tilkoblet, vil leads vises her." Applicant names enriched in-memory from a single `applicants` query (no nested PostgREST — Phase 3/4 pattern).
- **Coming-soon cards**: render real `Card` with disabled CTA and `IntegrationStatusBadge status="not-configured"`.

## Stability/regression rules applied

- All dialogs mounted at the parent component (Phase 2 lesson) — open/close handlers passed down.
- Any `DropdownMenu` inside dialogs uses `modal={false}`.
- All new query hooks use `refetchOnMount: 'always'` (Phase 3/5b cache lesson) so admins see fresh state on tab navigation.
- Foreign-key joins avoided in queries; in-memory enrichment with separate `applicants` lookup (Phase 4/5b lesson).
- `useImport.ts` retains existing batch/dedup/event behaviour — only the destination column changes.

## Verification (post-build)

1. Migration applies; three new tables present; `applicants.external_id` + partial unique index present; updated source CHECK includes `other`.
2. Backfill row count reported (`UPDATE … RETURNING` count or follow-up `SELECT count(*)`).
3. `/admin/recruitment?tab=integrations` renders new hub; all three sections visible; coming-soon cards render with proper titles.
4. CSVImportCard stats match DB; button navigates to `/recruitment/import`.
5. Meta create flow: open dialog → fill → save → card flips to "Klar for kobling" amber. Reload preserves state.
6. Form mapping dialog: add mapping with form_id "12345" + open position → persists across reload.
7. LeadIngestionLogPanel renders empty state with zero rows.
8. New CSV import writes row data into `source_details` (not `metadata`).
9. TypeScript compiles cleanly; no body-style leaks after dialog open/close cycles.

## Out of scope (deferred to Phase C)

- `meta-lead-webhook` edge function (HMAC verify, Graph API fetch, applicant upsert)
- Meta app review submission
- Live Meta ingestion testing
- Field mapping UI for Meta custom questions
- Token encryption-at-rest (Phase D)
