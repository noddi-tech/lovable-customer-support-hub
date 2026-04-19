
# Plan: Fix source enum mismatch in CSV import

The DB CHECK constraint `applicants_source_check` expects snake_case enum values, but the UI is sending Norwegian display labels — causing all 10 rows to fail.

## Changes

### 1. `ImportConfigureStep.tsx`
Convert `SOURCES` from string array to `{value, label}[]`:
```ts
const SOURCES = [
  { value: 'meta_lead_ad', label: 'Meta Lead Ad' },
  { value: 'finn', label: 'Finn.no' },
  { value: 'csv_import', label: 'CSV Import' },
  { value: 'website', label: 'Nettside' },
  { value: 'referral', label: 'Referanse' },
];
```
Update the `<Select>` map to render `<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>`.

Also update the GDPR auto-check `useEffect`: change `source === 'Meta Lead Ad'` → `source === 'meta_lead_ad'`.

### 2. `RecruitmentImport.tsx`
- Initial state: `useState<string>('meta_lead_ad')` (was `'Meta Lead Ad'`)
- `reset()` function: same change
- `onParsed` handler in upload step: `if (detectedMeta) setSource('meta_lead_ad')` (was `'Meta Lead Ad'`)

### 3. `ImportUploadStep.tsx`
Audit confirms: this file does NOT set source itself — it only emits `detectedMeta` boolean. The source-setting lives in `RecruitmentImport.tsx`'s `onParsed` callback (covered above). No changes needed here.

## Verification
After fix: re-upload test CSV → 10 rows insert successfully without `applicants_source_check` violation.

## Files modified
- `src/components/dashboard/recruitment/import/ImportConfigureStep.tsx`
- `src/components/dashboard/recruitment/RecruitmentImport.tsx`
