
## Final plan: Tab 2 — E-postmaler (with 3 approved revisions)

### Revisions baked in
1. **Single query key**: `['recruitment-email-templates', orgId]`. Fetch ALL rows (incl. soft-deleted). Filter + search client-side via `useMemo`. One invalidation covers every view; cross-filter transitions are instant.
2. **Audit-survival check**: Add step 20b — after hard-delete, query `recruitment_settings_audit WHERE entity_id = {id}` and assert ≥1 row with `change_type='DELETE'` and `old_value->>'name'` matching.
3. **Forward-compatible usage stats**: Try `email_events.template_id` → fall back to `messages.metadata->>'template_id'` → fall back to "—". Detect missing-relation via `error.code === '42P01'` or message includes `'does not exist'`. Any successful query (even zero rows) lights up real counts.

### File structure (final)
```
src/components/dashboard/recruitment/admin/templates/
├── EmailTemplatesTab.tsx
├── EmailTemplateList.tsx
├── EmailTemplateListRow.tsx
├── EmailTemplateEditor.tsx
├── EmailTemplateTipTap.tsx
├── EmailTemplatePreview.tsx
├── EmailTemplateUsageStats.tsx
├── EmailTemplateDeletedView.tsx
├── MergeFieldDropdown.tsx
├── PermanentDeleteDialog.tsx
├── mergeFields.ts
├── types.ts
├── useEmailTemplates.ts          # single key, client-side filter+search
├── useEmailTemplate.ts           # single template + all 5 mutations
├── useTemplateUsageStats.ts      # graceful-degrade two-source query
└── useTestSendTemplate.ts
```
Wire-up: replace `PlaceholderTab` for `templates` in `src/pages/admin/RecruitmentAdmin.tsx`.

New deps: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `@tiptap/extension-underline`.

### Query keys (final)
| Hook | Key | refetchOnMount | Invalidated by |
|---|---|---|---|
| `useEmailTemplates()` | `['recruitment-email-templates', orgId]` | `'always'` | all create/update/soft-delete/restore/hard-delete |
| `useEmailTemplate(id)` | `['recruitment-email-template', id]` | `'always'` | update/soft-delete/restore for that id |
| `useTemplateUsageStats(id)` | `['recruitment-template-usage', id]` | default | n/a (read-only, refreshes on mount via React Query default once stats infra exists) |
| `useDefaultPipeline()` | reuse from `pipeline/usePipelineAdmin.ts` | unchanged | n/a |

Filter + search are pure client-side derivations from the single cached list.

### Mutation invalidation (final)
- create / update / soft-delete / restore: invalidate `['recruitment-email-templates', orgId]` + `['recruitment-email-template', id]` (where applicable)
- hard-delete: invalidate `['recruitment-email-templates', orgId]` + `queryClient.removeQueries(['recruitment-email-template', id])`

### Test-send: reuse `send-email` (confirmed)
Existing function accepts `{ to, subject, html, from_name }` — perfect fit. No new edge function. Check `{ error }` from `supabase.functions.invoke` directly per Core rule.

### Usage-stats two-source pattern
```ts
async function fetchStats(templateId: string) {
  // Try 1: email_events table
  try {
    const { data, error } = await supabase
      .from('email_events' as any)
      .select('event_type, created_at')
      .eq('template_id', templateId);
    if (!error) return computeFromEvents(data);
    if (!isMissingRelation(error)) throw error;
  } catch (e) { if (!isMissingRelation(e)) throw e; }

  // Try 2: messages.metadata->>'template_id'
  try {
    const { data, error } = await supabase
      .from('messages' as any)
      .select('created_at, metadata')
      .filter('metadata->>template_id', 'eq', templateId);
    if (!error) return computeFromMessages(data);
    if (!isMissingRelation(error)) throw error;
  } catch (e) { if (!isMissingRelation(e)) throw e; }

  return null; // signals "—" fallback
}
const isMissingRelation = (e: any) =>
  e?.code === '42P01' || /does not exist/i.test(e?.message ?? '');
```

### Verification checklist (21 + 20b = 22 steps)
Steps 1-21 unchanged from approved plan. Adding **20b**:

> **20b. Audit survival.** After the "Slett permanent" confirm in step 20 completes, run in Supabase SQL editor:
> ```sql
> SELECT change_type, old_value->>'name' AS deleted_name, created_at
> FROM recruitment_settings_audit
> WHERE entity_id = '{deleted_template_id}'
> ORDER BY created_at DESC;
> ```
> Assert: at least one row exists with `change_type = 'DELETE'` and `deleted_name` matching the template's name at deletion time. This proves the audit trail survives hard-delete — the whole reason the audit infra was built before Tab 2.

### Constraints honored
Tailwind v3 only · Norwegian Bokmål · reuses `useDefaultPipeline` + `send-email` · `refetchOnMount: 'always'` · `{ error }` checked directly · react-hook-form + zod · soft-delete preserves audit · hard-delete double-confirmed + audit-verified · 99.9% uptime (no global config touched, scoped query keys only).
