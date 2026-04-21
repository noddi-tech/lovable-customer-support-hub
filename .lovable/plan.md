

## Plan: Phase 2 — Rules CRUD UI for `/admin/recruitment` → "Automatisering"

Builds the third tab on the existing `RecruitmentAdmin` page. UI-only — no schema or RPC work; backend is already shipped.

### Scope

In: list, create, edit, delete, duplicate, toggle-active, drag-to-reorder for `recruitment_automation_rules` rows. Side sheet form with conditional trigger/action sections. Norwegian labels matching Tab 1/Tab 2 tone.

Out (per spec): SMS/task action editors, dry-run, execution log view, failure banners, search/filter, presets.

Pre-existing build errors in `fetch-gmail-attachment`, `noddi-customer-lookup`, `send-reply-email` etc. are unrelated to the recruitment module and outside this task's scope — flagging only; will not be touched here.

### Files to create

```
src/components/dashboard/recruitment/admin/rules/
  RulesTab.tsx
  RulesList.tsx
  RuleCard.tsx
  RuleEditor.tsx
  sections/
    TriggerConfigSection.tsx
    ActionConfigSection.tsx
  hooks/
    useRules.ts
    useRuleMutations.ts
  types.ts
```

### Files to modify

- `src/pages/admin/RecruitmentAdmin.tsx` — replace the `automation` `<TabsContent>` placeholder with `<RulesTab />` (import only; tab trigger already exists).

### Component composition

```text
RulesTab
 ├─ Header ("Automasjonsregler" + subtitle + [+ Ny regel])
 ├─ EmptyState  (when rules.length === 0)
 └─ RulesList
     ├─ DndContext + SortableContext (vertical)
     └─ RuleCard[]   (drag handle, name, badges, stats, menu)
        └─ AlertDialog (Slett confirm; rendered inside card)
 RuleEditor (Sheet, side=right, ~600px / full on mobile)
   ├─ Header
   ├─ Form (RHF + zod)
   │   ├─ Navn (Input + register)
   │   ├─ Beskrivelse (controlled Textarea, emojiAutocomplete={false})
   │   ├─ Aktiv (Switch)
   │   ├─ Separator
   │   ├─ TriggerConfigSection   (type Select + conditional config)
   │   ├─ Separator
   │   └─ ActionConfigSection    (type Select + conditional config)
   └─ Sticky footer  [Avbryt] [Lagre]
```

### Hooks

- `useRules()` — `useQuery` keyed `['recruitment-automation-rules', orgId]`, ordered by `execution_order ASC, created_at ASC`, org-scoped.
- `useStagesForOrg()` (in `useRules.ts`) — fetches all `recruitment_pipelines` for the org, flattens `stages` JSONB, dedupes by `id`. Used in trigger config.
- `usePositionsForOrg()` — fetches `job_positions` for the org (id, title, status). Used in trigger config.
- `useActiveTemplatesForOrg()` — `recruitment_email_templates` filtered `is_active=true AND soft_deleted_at IS NULL`, ordered by name. Used in action config.
- `useAssignableUsersForOrg()` — joins `profiles` with `organization_memberships` where `status='active'` and `role IN ('admin','super_admin','agent')`. Display: `full_name` + role suffix.
- `useRuleMutations()` exposes:
  - `createRule(values)`
  - `updateRule(id, values)`
  - `deleteRule(id)`
  - `toggleActive({ id, is_active })` — optimistic, rollback on error
  - `duplicateRule(rule)` — inserts copy with `name + ' (kopi)'`, `is_active=false`, `execution_order = max+1`
  - `reorderRules(updates: {id, execution_order}[])` — optimistic; rollback on error; uses parallel `update` per row (no RPC needed since RLS already restricts to admins)

All mutations invalidate `['recruitment-automation-rules', orgId]`. Toast feedback via `sonner`.

### Form & validation (`types.ts`)

Use the exact `ruleFormSchema` from the spec (`zod` with `superRefine` for trigger/action config rules).

```ts
export type RuleFormValues = z.infer<typeof ruleFormSchema>;
export const NEW_RULE_DEFAULTS: RuleFormValues = {
  name: '',
  description: '',
  is_active: true,
  trigger_type: 'stage_entered',
  trigger_config: {},
  action_type: 'send_email',
  action_config: {},
};
```

Also defines presentation maps:
- `TRIGGER_LABELS` — `{ stage_entered: 'Søker bytter til en fase', application_created: 'Ny søknad opprettes' }`
- `ACTION_OPTIONS` — array with `{ value, label, disabled?, comingSoon? }` for the 5 entries.
- `formatTriggerSummary(rule, lookups)` and `formatActionSummary(rule, lookups)` — used by `RuleCard` to render the human badges (e.g. *"Når søker går til 'Kvalifisert' → Send e-post: 'Søknad mottatt'"*).

### Key UI rules (matching existing tabs)

- **Controlled `Textarea`** for Beskrivelse: `emojiAutocomplete={false}`, value from `form.watch('description')`, update via `form.setValue` with `shouldDirty/shouldValidate`. (The Tab 2 Beskrivelse fix.)
- All other inputs use `form.register()` for `Input` and controlled value/`onValueChange` for `Select`/`Switch`, mirroring `EmailTemplateEditor.tsx`.
- Disabled `SelectItem` rows for `send_sms` and `create_task` rendered with `disabled` prop + Tooltip "Kommer i en senere fase".
- Drag uses `@dnd-kit/core` + `@dnd-kit/sortable` (`PointerSensor`, `verticalListSortingStrategy`, `arrayMove`) — same shape as `PipelineEditor` + `StageRow`.
- Side sheet uses existing `@/components/ui/sheet` with `side="right"` and `className="w-full sm:max-w-xl overflow-y-auto"`. Footer is sticky inside the sheet.
- Rule cards use `Card` with reduced `opacity-60` + italic "Inaktiv" pill when `!is_active`.
- Empty state uses a centered card with `Zap` icon + Norwegian copy and `[+ Opprett første regel]` (opens editor in create mode).

### Behaviour details

- Sheet open state lives in `RulesTab`: `editorState: { mode: 'create' } | { mode: 'edit'; rule: Rule } | null`.
- Form `defaultValues` are recomputed via `useMemo` from `editorState`; `useEffect` calls `form.reset(defaultValues)` when `editorState` changes (mirrors `EmailTemplateEditor`).
- Switching `trigger_type` clears `trigger_config` to `{}` so stale keys never persist; same for `action_type` → `action_config`. This keeps the audit log entries clean.
- Save button: `disabled={!form.formState.isValid || isSaving}`. Loading spinner inside button.
- On success: `toast.success('Regel opprettet')` / `'Regel lagret'`, close sheet, query auto-invalidates → list refreshes.
- Delete: `AlertDialog` with the exact Norwegian copy from the spec; on confirm, `deleteRule.mutate(id)` then toast.
- Duplicate: reads current rule from cache (no extra fetch needed), strips `id/created_at/updated_at/execution_count/last_executed_at`, sets `name = rule.name + ' (kopi)'`, `is_active = false`, `execution_order = max(existing) + 1`, inserts.

### Verification

All 20 checks in the spec map directly to:
- Tabs/empty/create flow → `RulesTab` + `EmptyState` + `RuleEditor` create mode.
- Conditional dropdowns → `TriggerConfigSection` / `ActionConfigSection` reading `form.watch('trigger_type'|'action_type')`.
- Disabled SMS/task with tooltip → `ACTION_OPTIONS` rendering.
- Card metadata + toggle + edit + duplicate + delete → `RuleCard` menu wired to mutations.
- Drag-to-reorder persistence → `RulesList` `handleDragEnd` → `reorderRules.mutate`.
- Webhook URL validation → `superRefine` block in `ruleFormSchema`; inline error under URL input.

### Out of scope (will not be touched)

- Pre-existing edge function build errors (`fetch-gmail-attachment`, `noddi-customer-lookup`, `send-reply-email`, etc.) — unrelated to recruitment, separate fix.
- Any DB migration — backend already shipped.
- Phases 3/4 features (execution log, dry-run, failure banners).

