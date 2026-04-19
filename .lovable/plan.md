

# Plan: Native job positions management page

Replace `RecruitmentPositions.tsx` placeholder with a real list + create dialog at `/operations/recruitment/positions`.

## File structure

**New files (in `src/components/dashboard/recruitment/positions/`):**
- `usePositions.ts` — TanStack Query hooks (list + create)
- `PositionStatusBadge.tsx` — colored status badge component
- `CreatePositionDialog.tsx` — the create dialog
- `PositionsTable.tsx` — the table component

**Modified:**
- `src/components/dashboard/recruitment/RecruitmentPositions.tsx` — assemble header + table + dialog

## Data layer (`usePositions.ts`)

Following the codebase pattern (plain Supabase + TanStack Query, RLS handles org filtering):

- `useJobPositions()` — `select('*, applications(count)').order('created_at', { ascending: false })` from `job_positions`. The nested `applications(count)` returns Postgres-aggregated counts in one round-trip. Returns rows with `applications: [{ count: number }]`.
- `useRecruitmentPipelines()` — `select('id, name, is_default')` from `recruitment_pipelines`, ordered with default first.
- `useCreateJobPosition()` — `useMutation` that inserts a row with `status: 'draft'`, `organization_id` from `useOrganizationStore().currentOrganizationId`, `requirements` as JSONB. On success: `queryClient.invalidateQueries({ queryKey: ['job-positions'] })` + sonner `toast.success('Stilling opprettet')`. On error: `toast.error(...)`.

## `PositionStatusBadge.tsx`

Map status → variant + label:
- `draft` → secondary/gray, "Utkast"
- `open` → green (`bg-green-100 text-green-800`), "Åpen"
- `paused` → yellow (`bg-yellow-100 text-yellow-800`), "Pauset"
- `closed` → red (`bg-red-100 text-red-800`), "Lukket"

## `PositionsTable.tsx`

Uses shadcn `Table` (matches `DataTable` styling). Columns: Tittel (bold, `<Link>` to `/operations/recruitment/positions/:id`), Sted, Kampanje (muted gray when empty, shows "—"), Status (badge), Søkere (number from `applications[0]?.count ?? 0`), Opprettet (`formatDistanceToNow(date, { addSuffix: true, locale: nb })` from `date-fns` + `date-fns/locale`).

States:
- Loading → 5 `<Skeleton>` rows
- Empty → centered card with `Briefcase` icon + "Ingen stillinger opprettet ennå. Klikk 'Opprett stilling' for å komme i gang."

## `CreatePositionDialog.tsx`

Plain `useState` form (consistent with `CreateTicketDialog`). No zod — simple inline validation (required title).

Fields, in order, inside `<Dialog><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">`:

1. **Tittel** — `<Input>` required
2. **Beskrivelse** — `<Textarea emojiAutocomplete={false}>` (avoid emoji picker on a job description)
3. **Sted** — `<Input>`
4. **Kampanje** — `<Input>`
5. **Ansettelsestype** — `<Select>` with: `full_time`→Heltid, `part_time`→Deltid, `contract`→Vikariat, `seasonal`→Sesong (default `full_time`)
6. **Lønnsspenn** — 2-col grid: `<Input type="number">` Min / Max with "NOK/år" suffix as muted helper text under each
7. Section heading **"Krav"** (h4 + border-top divider)
8. **Førerkortklasses** — grid of `<Checkbox>` + `<Label>` pairs for `['B','B96','BE','C1','C1E','C','CE','D1','D1E','D','DE']`, stored in a `Set<string>`
9. **Minimum års erfaring** — `<Input type="number" min={0}>`
10. **Sertifiseringer** — chip input: `<Input>` + Enter handler appends to `string[]`, displayed as `<Badge variant="secondary">{cert} <X onClick={remove} /></Badge>` (mirrors the Tags pattern in `CreateTicketDialog`)
11. **Pipeline** — `<Select>` populated from `useRecruitmentPipelines()`, pre-selected to default pipeline once data loads (via `useEffect`)

Footer: Avbryt + Opprett stilling (disabled while pending or title empty, with `<Loader2 className="animate-spin">`).

On submit, build payload:
```ts
{
  title, description: description || null, location: location || null,
  campaign: campaign || null, employment_type, 
  salary_range_min: minSalary ? Number(minSalary) : null,
  salary_range_max: maxSalary ? Number(maxSalary) : null,
  pipeline_id: pipelineId || null,
  requirements: {
    drivers_license: Array.from(licenseClasses),
    min_experience_years: minYears ? Number(minYears) : null,
    certifications,
  },
  status: 'draft',
  organization_id: currentOrganizationId,
}
```
Insert → on success: reset form, close dialog (parent handles invalidation via the hook).

## `RecruitmentPositions.tsx` (assembled page)

```
<div className="p-6 space-y-4">
  <div className="flex items-center justify-between">
    <h2 className="text-2xl font-semibold">Stillinger</h2>
    <Button onClick={() => setOpen(true)}><Plus /> Opprett stilling</Button>
  </div>
  <PositionsTable />
  <CreatePositionDialog open={open} onOpenChange={setOpen} />
</div>
```

## Notes
- All UI strings are Norwegian Bokmål (matches existing recruitment tabs).
- RLS on `job_positions` (`organization_id` filter) handles scoping automatically — no client-side `.eq()` needed for the list query.
- The `applications(count)` embedded select requires the FK `applications.position_id → job_positions.id`, which exists per the schema dump.
- Detail page (`/positions/:id`) is already a placeholder — out of scope here, the title link just navigates to it.

