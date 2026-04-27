
Defensively normalize `result.action_results` in `DryRunResultCard.tsx` so the card handles all three shapes the engine currently emits, without touching the engine or any other UI.

## Scope

Edit only:
- `src/components/dashboard/recruitment/admin/rules/dryrun/DryRunResultCard.tsx`

Do not change:
- `executions/types.ts` helpers
- `ExecutionDetailDrawer` rendering
- `DryRunResults` / `DryRunPanel`
- The `DryRunResult` type (still typed as `Json` from RPC)

## Three shapes to support

1. **Array of action result objects** (regular run shape)
   - Render exactly as today: one sub-card per action with `getSimulatedActionLabel`, details grid, error block.

2. **Single object with `preview` field** (current dry-run shape)
   ```json
   {
     "dry_run": true,
     "preview": "Would send \"Subject\" to <recipient>",
     "success": true,
     "duration_ms": 3
   }
   ```
   Render a single "Simulering" sub-card with:
   - Header label: `Simulering`
   - Body: the `preview` string verbatim, with light, safe English→Norwegian substitution applied (see below). If the string doesn't contain those tokens, it is shown as-is.
   - Status badge derived from the object's `success` field:
     - `true` → `Vellykket simulering` (success styling)
     - `false` → `Simuleringsfeil` (destructive styling)
   - Duration: prefer the object's `duration_ms` over `result.duration_ms` when present.
   - If `success === false` and the object has `error` / `error_message`, render that in the same destructive error block style used for array-shape failures.

3. **Null / undefined / empty** (no actions)
   - Render existing empty state: `Ingen handlinger ble simulert for denne regelen.`

## Normalization logic

Introduce a small discriminated normalization step at the top of the component:

```ts
type NormalizedDryRun =
  | { kind: 'actions'; items: DryRunActionResult[] }
  | { kind: 'preview'; preview: string; success: boolean; duration_ms: number | null; error: string | null }
  | { kind: 'empty' };

function normalize(raw: unknown): NormalizedDryRun {
  if (Array.isArray(raw)) {
    return raw.length === 0
      ? { kind: 'empty' }
      : { kind: 'actions', items: raw as DryRunActionResult[] };
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.preview === 'string') {
      return {
        kind: 'preview',
        preview: obj.preview,
        success: obj.success !== false, // default true
        duration_ms: typeof obj.duration_ms === 'number' ? obj.duration_ms : null,
        error: typeof obj.error_message === 'string'
          ? obj.error_message
          : typeof obj.error === 'string' ? obj.error : null,
      };
    }
  }
  return { kind: 'empty' };
}
```

## Preview translation (best-effort, non-fragile)

Apply only these literal substitutions in this order; if none match, show the raw string. This is intentionally minimal so future changes to the engine string don't silently misrender:

```
"Would send"     → "Ville sendt"
"to <no email>"  → "til <ingen e-post>"
"to <recipient>" → "til <mottaker>"
```

Implemented as plain `String.prototype.replaceAll` calls. No regex parsing of the rest of the string.

## Render plan per kind

- `kind === 'empty'`: existing dashed-border empty state.
- `kind === 'actions'`: existing `.map` over items (unchanged).
- `kind === 'preview'`: one sub-card with the same outer wrapper styling as the action sub-card, containing:
  - Left column:
    - `<p className="font-medium">Simulering</p>`
    - `<p className="text-xs text-muted-foreground">Forhåndsvisning fra automatiseringsmotor</p>`
  - Right column: success/failure badge as described.
  - Below: `<p className="text-sm whitespace-pre-wrap break-words">{translated preview}</p>`.
  - If failed and `error` present: existing destructive error block.
  - Footer-ish meta line: `Varighet: {formatDuration(duration_ms)}` only when it differs from the header duration, to avoid duplication.

The card's outer header / overall status badge / "Åpne i utførelseslogg" footer remain unchanged.

## Verification

1. Re-run a dry-run on an email rule with the `qualified` stage trigger.
2. The matched-rule card now renders a "Simulering" sub-card with the preview string instead of "Ingen handlinger ble simulert".
3. A successful preview shows the green `Vellykket simulering` badge; a `success: false` object would show `Simuleringsfeil` with the error block.
4. Existing regular-execution detail rendering (in `ExecutionDetailDrawer`) is untouched and still works for array-shape `action_results`.
5. `npx tsc --noEmit` reports no new errors.

## Reply after implementation

1. Updated `DryRunResultCard.tsx` (the normalization block + the new preview render branch).
2. Confirmation that TypeScript still compiles cleanly.
