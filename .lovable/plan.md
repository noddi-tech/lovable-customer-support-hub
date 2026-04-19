

# Plan: Native Applicants list page

Replace `RecruitmentApplicants.tsx` placeholder with a real list + create dialog at `/operations/recruitment/applicants`.

## File structure

**Modified:**
- `src/components/dashboard/recruitment/RecruitmentApplicants.tsx` — assemble header + filters + table + dialog

**New (in `src/components/dashboard/recruitment/applicants/`):**
- `useApplicants.ts` — TanStack Query hooks: `useApplicants(filters)`, `useCreateApplicant()`, `useApplicantPipeline()` (helper that returns the default pipeline's stages map for status badge colors)
- `ApplicantSourceBadge.tsx` — colored source badge
- `ApplicantStageBadge.tsx` — stage badge (uses pipeline stage colors from JSONB)
- `ApplicantsFilterBar.tsx` — search + 3 selects
- `ApplicantsTable.tsx` — the table itself
- `CreateApplicantDialog.tsx` — the create dialog with multi-insert mutation

## Data layer (`useApplicants.ts`)

**`useApplicants({ search, source, positionId, stageId })`** — query key `['applicants', org, filters]`.
- Uses 300ms-debounced `search` from caller.
- Builds query: `from('applicants').select('*, applications(id, current_stage_id, score, assigned_to, applied_at, position_id, job_positions(id, title))').order('created_at', { ascending: false })`
- Server-side filters (when value !== 'all'):
  - `source` → `.eq('source', source)`
  - `positionId` → `.eq('applications.position_id', positionId)` + inner-join hint via `applications!inner(...)` so the filter actually scopes rows
  - `stageId` → `.eq('applications.current_stage_id', stageId)` + same inner-join
  - `search` → `.or('first_name.ilike.%q%,last_name.ilike.%q%,email.ilike.%q%,phone.ilike.%q%')` with sanitized `q`
- Returns rows with `applications: [...]` (each having nested `job_positions`).

**`useApplicantPipeline()`** — fetches default pipeline (`is_default = true`) `stages` JSONB to look up stage name + color in the table. Query key `['recruitment-pipeline-default', org]`.

**`useCreateApplicant()`** — multi-step mutation. Input includes basic fields + `positionId`, `source`, `qualifications`, `noteContent`. Sequence:
1. Insert into `applicants` with `organization_id`, `gdpr_consent: true`, `gdpr_consent_at: now()`, `source`, plus qualification fields (`drivers_license_classes`, `years_experience`, `availability_date`, `language_norwegian`, `work_permit_status`). Returns `applicantId`.
2. Insert into `applications` with `applicant_id`, `position_id`, `current_stage_id: 'not_reviewed'`, `organization_id`. Returns `applicationId`.
3. Insert into `application_events`: `event_type: 'created'`, `event_data: { source }`, `performed_by: profile.id`.
4. If `noteContent` not empty: insert into `applicant_notes` (`author_id: profile.id`, `note_type: 'internal'`, `application_id: applicationId`) AND `application_events` (`event_type: 'note_added'`, `event_data: { note_type: 'internal', preview: noteContent.slice(0,100) }`).
5. Returns `applicantId`. On success: invalidate `['applicants']`, `['job-positions']`; toast "Søker opprettet"; caller navigates to detail page.

`profile.id` comes from `useAuth()` (already exposes `profile: UserProfile`).

## `ApplicantSourceBadge.tsx`
Map `source` → label + tailwind color pair:
- `meta_lead_ad` → blue, "Meta"
- `finn` → orange, "Finn.no"
- `website` → purple, "Nettside"
- `referral` → green, "Referanse"
- `manual` → gray, "Manuell"
- `csv_import` → indigo, "CSV"

Use solid background pairs like `bg-blue-100 text-blue-800` (matching `PositionStatusBadge` style).

## `ApplicantStageBadge.tsx`
Props: `stageId`, `pipeline` (stages JSONB array). Looks up `{ name, color }` in `pipeline.stages.find(s => s.id === stageId)`. Renders inline-styled badge using stage `color` (hex) as background with auto-contrast text. Falls back to muted "—" if not found.

## `ApplicantsFilterBar.tsx`
Flex row, `gap-3 items-center flex-wrap`:
- `<Input>` with leading `<Search>` icon, controlled `searchInput`, debounced via `useDebounce(searchInput, 300)` (already present at `src/hooks/useDebounce.ts`) — debounced value is what flows into the query
- Source `<Select>`: Alle, Meta Lead Ad, Finn.no, Nettside, Referanse, Manuell, CSV Import
- Position `<Select>`: Alle + map of `useJobPositions()` → `<SelectItem value={p.id}>{p.title}</SelectItem>`
- Status `<Select>`: Alle + 4 hard-coded stage IDs `not_reviewed` "Ikke vurdert", `qualified` "Kvalifisert & i dialog", `disqualified` "Diskvalifisert", `hired` "Ansatt"

State lives in parent (`RecruitmentApplicants`) so it can be passed to both `ApplicantsTable` and the URL-less query.

## `ApplicantsTable.tsx`
Standard shadcn `Table` matching `PositionsTable` pattern.

Columns: Navn, E-post, Telefon, Kilde, Stilling, Status, Poeng, Søkt.

- **Navn** — `<Link to={'/operations/recruitment/applicants/' + a.id}>` bold, `${first_name} ${last_name}`
- **E-post** — `text-sm text-muted-foreground`
- **Telefon** — value or muted "—"
- **Kilde** — `<ApplicantSourceBadge source={a.source} />`
- **Stilling** — `apps[0]?.job_positions?.title ?? "—"` + `apps.length > 1 && <Badge variant="secondary">+{apps.length-1}</Badge>`
- **Status** — `<ApplicantStageBadge stageId={apps[0]?.current_stage_id} pipeline={pipeline} />`
- **Poeng** — `apps[0]?.score`. Color: `score < 30` red, `30–60` amber, `>60` green. Else "—".
- **Søkt** — `formatDistanceToNow(applied_at, { addSuffix: true, locale: nb })`

States:
- Loading → 5 skeleton rows × 8 cells
- Empty → centered card, `<Briefcase>` icon + "Ingen søkere ennå. Legg til søkere manuelt eller importer fra CSV."

## `CreateApplicantDialog.tsx`
`<Dialog>` + `<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">`. Plain `useState` form (consistent with `CreatePositionDialog`).

Fields:
1. Fornavn `<Input>` required
2. Etternavn `<Input>` required
3. E-post `<Input type="email">` required
4. Telefon `<Input>`
5. Stilling `<Select>` — required, populated from `useJobPositions().filter(p => p.status === 'open')`
6. Kilde `<Select>` — Manuell (default), Referanse, Nettside, Finn.no
7. Section "Kvalifikasjoner" (h4 + border-top):
   - Førerkortklasser — same checkbox grid as `CreatePositionDialog` (B, B96, BE, C1, C1E, C, CE, D1, D1E, D, DE)
   - Års erfaring — `<Input type="number" min={0}>`
   - Tilgjengelig fra — `<Input type="date">` (native date input, consistent with simplicity here)
   - Norsk nivå — `<Select>`: native, fluent, conversational, basic, none → Norwegian labels
   - Arbeidstillatelse — `<Select>`: citizen, permanent_resident, work_permit, needs_sponsorship → Norwegian labels
8. GDPR samtykke — `<Checkbox>` + label, required (submit disabled until checked): "Søkeren har gitt samtykke til behandling av personopplysninger"
9. Notat — `<Textarea emojiAutocomplete={false}>`, optional

Submit:
- Build qualifications object, call `createMut.mutateAsync(...)`
- On success: close dialog, reset form, `navigate('/operations/recruitment/applicants/' + newApplicantId)`

Footer: Avbryt + Opprett søker (disabled while pending or required fields missing or GDPR unchecked, with `<Loader2 className="animate-spin">`).

## `RecruitmentApplicants.tsx` (assembled)
```
<div className="p-6 space-y-4">
  <div className="flex items-center justify-between">
    <h2 className="text-2xl font-semibold">Søkere</h2>
    <Button onClick={() => setOpen(true)}><Plus /> Legg til søker</Button>
  </div>
  <ApplicantsFilterBar value={filters} onChange={setFilters} />
  <ApplicantsTable filters={filters} />
  <CreateApplicantDialog open={open} onOpenChange={setOpen} />
</div>
```

State: `filters = { search, source: 'all', positionId: 'all', stageId: 'all' }`.

## Notes
- RLS scopes by org for all involved tables (verified in schema dump).
- The `current_stage_id` is text matching `stages[].id` in the pipeline JSONB — colors come from there.
- Search uses sanitized input to avoid breaking PostgREST `.or()` syntax (escape commas/parens/% via simple replacement before interpolating).
- `useDebounce` (already exists) handles the 300 ms debounce.
- No new shadcn deps; everything is in place.

