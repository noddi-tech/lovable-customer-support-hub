
# Plan: CSV Import wizard for applicants

Replace `RecruitmentImport.tsx` placeholder at `/operations/recruitment/import` with a 5-step wizard for bulk-importing applicants from CSV/TSV/XLSX (Meta Lead Ads, Finn.no, etc.).

## Dependencies to add
- `papaparse` + `@types/papaparse` — CSV/TSV parsing
- `xlsx` (SheetJS) — XLSX parsing

## File structure

**New (`src/components/dashboard/recruitment/import/`):**
- `useImport.ts` — `useBulkCreateApplicants()` mutation
- `parseFile.ts` — pure helpers: `parseCsv`, `parseXlsx`, `autoDetectMapping`, `splitFullName`, `mapRow`
- `ImportUploadStep.tsx` — drop zone + Meta export instructions
- `ImportMappingStep.tsx` — header → field mapping table + preview
- `ImportConfigureStep.tsx` — position/source/GDPR + summary
- `ImportProgressStep.tsx` — progress bar during import
- `ImportDoneStep.tsx` — results card + error list

**Modified:**
- `src/components/dashboard/recruitment/RecruitmentImport.tsx` — wizard shell holding state and rendering current step

## State (in `RecruitmentImport.tsx`)
```ts
type Step = 'upload' | 'map' | 'configure' | 'importing' | 'done';
const [step, setStep] = useState<Step>('upload');
const [headers, setHeaders] = useState<string[]>([]);
const [rows, setRows] = useState<Record<string, string>[]>([]);
const [mapping, setMapping] = useState<Record<string, TargetField>>({});
const [positionId, setPositionId] = useState<string>('');
const [source, setSource] = useState<string>('Meta Lead Ad');
const [gdprConfirmed, setGdprConfirmed] = useState(true);
const [progress, setProgress] = useState({ current: 0, total: 0 });
const [result, setResult] = useState<ImportResult | null>(null);
```

## Target fields (mapping)
```
'ignore' | 'first_name' | 'last_name' | 'full_name'
| 'email' | 'phone' | 'location'
| 'drivers_license_classes' | 'years_experience' | 'note'
| 'metadata'  // default for unrecognized columns
```

`autoDetectMapping(headers)` matches case-insensitively against:
- `full_name|full name` → `full_name`
- `first_name|first name|fornavn` → `first_name`
- `last_name|last name|etternavn` → `last_name`
- `email|e-post|epost` → `email`
- `phone_number|phone|telefon|mobile` → `phone`
- `city|sted|location|by` → `location`

Anything else defaults to `metadata`.

## `mapRow(row, mapping)` → applicant input
- If `full_name` mapped: split on first space — `parts[0]` → `first_name`, rest joined → `last_name`
- `drivers_license_classes`: split on comma, trim, uppercase
- `years_experience`: parseInt, NaN → null
- All `metadata`-mapped columns aggregated into `{ [csvHeader]: value }` JSONB
- Unmapped/`ignore` columns dropped
- `note` value (if present) becomes the initial `applicant_notes` insert content

## `useBulkCreateApplicants()` (in `useImport.ts`)
Input: `{ rows: ApplicantInput[], position_id, source, onProgress?: (current, total) => void }`

For each row (processed sequentially in batches of 10 via `Promise.all` chunks):
1. Validate email present + basic regex; if invalid → `errors.push({ row, reason })`, skip
2. Check duplicate via `supabase.from('applicants').select('id').eq('organization_id', orgId).ilike('email', email).maybeSingle()` — if found → `duplicates++`, skip
3. Insert applicant (org_id, name, email, phone, source, gdpr_consent=true if confirmed, qualifications, `metadata` JSONB)
4. Insert application (`current_stage_id: 'not_reviewed'`, position_id, org_id)
5. Insert `application_events` row (`event_type: 'created'`, `event_data: { source, import: true }`, `performed_by: profile.id`)
6. If `note` present → insert `applicant_notes` + `note_added` event (mirrors `useCreateApplicant`)
7. Catch per-row errors → `errors.push({ row, reason: err.message })`
8. After each batch, call `onProgress(processed, total)`

Return `{ imported, duplicates, errors }`. No toast inside hook (the Done step renders results).

## Step UIs

**ImportUploadStep**
- `<Card>` with dashed border, `<Upload>` icon, drop zone (`onDragOver`/`onDrop` + hidden `<input type="file" accept=".csv,.tsv,.xlsx">`)
- On file: detect by extension → `parseCsv` (papaparse, `header: true, skipEmptyLines: true, transformHeader: h => h.trim()`) or `parseXlsx` (SheetJS `XLSX.utils.sheet_to_json`)
- Set `headers` + `rows`, run `autoDetectMapping`, advance to `map`
- Below: muted instructions card "Slik eksporterer du fra Meta Lead Ads…"

**ImportMappingStep**
- Two-column grid: each CSV header on left, `<Select>` on right with target field options (Norwegian labels matching spec)
- Below: preview `<Table>` of first 5 mapped rows showing `first_name`, `last_name`, `email`, `phone` — invalid (missing email) rows get `bg-destructive/10`
- Footer: "Tilbake" / "Neste" — `Neste` disabled unless any mapping resolves to `email` (or `full_name` + `email`)

**ImportConfigureStep**
- `<Select>` of open positions from `useJobPositions().filter(p => p.status === 'open')` (required)
- `<Select>` source: Meta Lead Ad / Finn.no / CSV Import / Nettside / Referanse (default = `Meta Lead Ad`; auto-flip to `Meta Lead Ad` if `full_name` was auto-detected)
- `<Checkbox>` GDPR (pre-checked when source = Meta Lead Ad), with full Norwegian label per spec
- Summary line: "Vil importere **X søkere** til stillingen '**[title]**'"
- Footer: "Tilbake" / "Importer X søkere" (disabled if no position or GDPR unchecked)

**ImportProgressStep**
- Centered `<Card>` with `<Progress value={current/total*100}>` + "Importerer søkere… {current}/{total}"
- `useEffect` triggers `mutateAsync` on mount; navigation is implicitly blocked because the wizard owns the only path forward

**ImportDoneStep**
- `<CheckCircle>` icon, "Import fullført!"
- 3-cell grid: green imported, yellow duplicates, red errors
- Errors rendered inside `<Collapsible>` "Vis feil ({n})" listing `Rad {row}: {reason}`
- Buttons: "Se søkere i pipeline" → `navigate('/operations/recruitment/pipeline')`, "Importer flere" → reset all state to initial + step `'upload'`

## Notes
- All UI strings Norwegian Bokmål.
- RLS handles org scoping for `applicants`, `applications`, `application_events`, `applicant_notes` (verified in earlier work).
- `metadata` column on `applicants` confirmed as JSONB in earlier schema dump.
- `gdpr_consent_at` set to `new Date().toISOString()` when checkbox confirmed.
- Per-row failures don't abort the whole import — they're collected and shown.
- No new shadcn deps; reuses Card, Select, Button, Checkbox, Progress, Table, Collapsible, Badge.
