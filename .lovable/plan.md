# Deploy 5 missing B3 edge functions

## Verified

- All 5 source files exist under `supabase/functions/`:
  - `meta-list-form-fields/index.ts`
  - `recruitment-bulk-import-start/index.ts`
  - `recruitment-bulk-import-execute/index.ts`
  - `recruitment-bulk-import-status/index.ts`
  - `recruitment-quarantine-approve/index.ts`
- `supabase/config.toml` already has all 5 entries with `verify_jwt = true` (under the "Phase B3 — Field mapping + bulk import" section).
- No code changes needed.

## Actions on approval

1. Deploy all 5 functions in one batch via `supabase--deploy_edge_functions` with:
   `["meta-list-form-fields", "recruitment-bulk-import-start", "recruitment-bulk-import-execute", "recruitment-bulk-import-status", "recruitment-quarantine-approve"]`
2. Verify by calling `meta-list-form-fields` via `supabase--curl_edge_functions` with body `{ "form_mapping_id": "a1404740-3128-4ab7-a032-faf247e9fc3a" }` and confirm response is either `{ questions: [...] }` or `{ scope_missing: true }` (not 404 / "function not found").
3. Spot-check `recruitment-bulk-import-status` with a dummy id to confirm it responds (expect 404 "Not found", which proves it's deployed).
4. Check `supabase--edge_function_logs` for `meta-list-form-fields` if the test call errors, to surface the real cause.

Note: `npx supabase functions list` requires a personal access token in this sandbox, which isn't available. I'll use `curl_edge_functions` instead — a successful response (or a structured 4xx from the function itself) proves ACTIVE status more reliably than the CLI listing.

## No code changes
Pure deploy + verification. If any function fails to deploy, I'll pull logs and report back before touching source.
