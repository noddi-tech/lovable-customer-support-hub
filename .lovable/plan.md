

# Plan: Full position detail page

Replace the `PositionDetail.tsx` placeholder at `/operations/recruitment/positions/:id` with a real detail page (header + tabs), and refactor `CreatePositionDialog` to also support edit mode.

## File structure

**Modified:**
- `src/components/dashboard/recruitment/positions/usePositions.ts` — add `useJobPosition(id)`, `useUpdateJobPosition()`, `useUpdateJobPositionStatus()`
- `src/components/dashboard/recruitment/positions/CreatePositionDialog.tsx` — accept optional `position` prop; switches to edit mode (title "Rediger stilling", button "Lagre endringer", UPDATE instead of INSERT, pre-fills fields via `useEffect`)
- `src/components/dashboard/recruitment/PositionDetail.tsx` — full rewrite

## Hooks (`usePositions.ts` additions)

- `useJobPosition(id)` — `select('*, recruitment_pipelines(id, name)')` from `job_positions`, `.eq('id', id).maybeSingle()`. Query key: `['job-position', id]`.
- `useUpdateJobPosition()` — `useMutation` doing `update(payload).eq('id', id)`. Invalidates `['job-position', id]` and `['job-positions']`. Toast: "Stilling oppdatert".
- `useUpdateJobPositionStatus()` — `useMutation({ id, status })`. Builds patch `{ status }`; if `status === 'open'` and current `published_at` is null, also adds `published_at: new Date().toISOString()`. Invalidates both queries. Toast: `Status endret til ${label}`.

## `CreatePositionDialog.tsx` refactor

Add optional prop `position?: JobPositionRow`. When present:
- Title → "Rediger stilling", submit button → "Lagre endringer"
- `useEffect` on `[position, open]` pre-fills all local state (title, description, location, campaign, employment_type, salary, license set, min years, certifications, pipelineId)
- Submit calls `updateMut` with same payload shape (excluding `status`, `organization_id` — those don't change here)
- `reset()` only runs on close in create mode; in edit mode close just clears local edits

## `PositionDetail.tsx` (full rewrite)

Layout: `<div className="p-6 max-w-5xl mx-auto space-y-6">`

### Header
- Back link `← Tilbake til stillinger` → `/operations/recruitment/positions`
- Row: `<h1 className="text-2xl font-semibold">{title}</h1>` + `<PositionStatusBadge>` + spacer + action buttons:
  - `<Button variant="outline" onClick={() => setEditOpen(true)}><Pencil/> Rediger</Button>`
  - `<DropdownMenu>` "Endre status" with items based on `position.status`:
    - `draft`: Publiser → `open`
    - `open`: Pause → `paused`, Lukk → `closed`
    - `paused`: Gjenåpne → `open`, Lukk → `closed`
    - `closed`: Gjenåpne → `open`

### Tabs (shadcn `Tabs`)
- **Detaljer** (default)
- **Søkere** — single muted line: "Søkerlisten kobles til når pipeline er bygget"

### Detaljer content — two `Card`s

**Card "Generelt"** — definition-list rows (label muted-foreground, value foreground):
- Tittel
- Beskrivelse — `whitespace-pre-wrap`, or muted "Ingen beskrivelse"
- Sted, Kampanje (muted "—" if null)
- Ansettelsestype — Norwegian label via lookup map (`full_time`→Heltid, `part_time`→Deltid, `contract`→Vikariat, `seasonal`→Sesong)
- Lønnsspenn — `NOK ${min.toLocaleString('nb-NO')} — NOK ${max.toLocaleString('nb-NO')} per år` (handles one-side-only too); else "Ikke spesifisert"
- Pipeline — `position.recruitment_pipelines?.name ?? "—"`
- Finn.no lenke — `<a href target="_blank" className="underline">` if set, else "—"
- Publisert — formatted date or "—"
- Lukkes — formatted date or "—"

**Card "Krav"** — reads `position.requirements` JSONB:
- Førerkortklasser — array of `<Badge variant="secondary">` per class, or "—"
- Minimum erfaring — `${n} år` or "Ikke spesifisert"
- Sertifiseringer — badges or "—"
- If all three are empty/missing → render single muted line "Ingen krav spesifisert"

### Loading / not-found
- While loading: skeleton header + skeleton card
- If `data === null`: "Stilling ikke funnet" with back link

### Edit dialog mount
At bottom: `<CreatePositionDialog open={editOpen} onOpenChange={setEditOpen} position={position} />`

## Status label map (shared)
```
{ draft: 'Utkast', open: 'Åpen', paused: 'Pauset', closed: 'Lukket' }
```
Used by status-change toast.

## Notes
- RLS already scopes by org; no extra filter needed.
- Date formatting uses `format(date, 'd. MMM yyyy', { locale: nb })` from `date-fns`.
- No new shadcn components needed — `Tabs`, `Card`, `DropdownMenu`, `Badge`, `Button` all already in use.

