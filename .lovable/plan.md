

# Fix Edge Function TypeScript Errors

## Problem
Build checker reports ~30+ TypeScript errors across edge functions, falling into three categories:
1. **`'error' is of type 'unknown'`** (~15 files) — catch blocks access `.message` without type narrowing
2. **`Cannot find name 'EdgeRuntime'`** (3 files) — Deno/Supabase runtime global not declared
3. **Type mismatches in `noddi-customer-lookup`** — `alternative_emails` not on interface, `string | null` assigned to `string`
4. **`Object is possibly undefined`** in `generate-analytics-report` — missing null guard on `.reduce()`

## Changes

### 1. Add `EdgeRuntime` type declaration (shared file)
Create `supabase/functions/_shared/edge-runtime.d.ts` declaring the global:
```typescript
declare const EdgeRuntime: { waitUntil(promise: Promise<any>): void };
```
This fixes errors in `database-recovery`, `helpscout-import` (3 occurrences).

### 2. Fix `'error' is of type 'unknown'` — all affected files
Replace `error.message` with `error instanceof Error ? error.message : String(error)` in catch blocks across these files:

| File | Lines |
|------|-------|
| `admin-cleanup-users/index.ts` | ~183 |
| `admin-get-all-users/index.ts` | ~166 |
| `bulk-close-old-conversations/index.ts` | ~102 |
| `cleanup-duplicate-messages/index.ts` | ~174 |
| `cleanup-forwarding-echoes/index.ts` | ~156 |
| `create-service-ticket/index.ts` | ~204 |
| `deduplicate-customers/index.ts` | ~164, ~181 |
| `helpscout-import/index.ts` | ~259, ~305, ~762, ~768, ~785 |
| `manage-import-job/index.ts` | ~86 |
| `monitor-database-health/index.ts` | ~110 |

### 3. Fix `noddi-customer-lookup/index.ts` type issues
- **Add `alternative_emails` to the `NoddihCustomerLookupRequest` interface** (line ~99): `alternative_emails?: string[];`
- **Change `buildResponse` param `email` type** from `email: string` to `email: string | null` (line 553), and update the destructured default to `email = ""` 
- **Fix `liveResponse.data.email`** (line 1567): use `successfulEmail || ""` instead of bare `successfulEmail`

### 4. Fix `generate-analytics-report/index.ts` null guard
Line ~202: wrap the `.reduce()` in parentheses with a null check:
```typescript
const avgQualityScore = totalKnowledgeEntries > 0
  ? (knowledgeStats?.reduce((sum, e) => sum + e.quality_score, 0) ?? 0) / totalKnowledgeEntries
  : 0;
```

## Technical detail
- The `EdgeRuntime` global is provided by Supabase's Deno edge runtime but has no type declarations. A `.d.ts` file in `_shared/` makes it visible to the TypeScript checker without any runtime import.
- All `error` catch blocks use the same pattern: `error instanceof Error ? error.message : String(error)` which is the idiomatic TypeScript approach for unknown errors.
- No behavioral changes — these are purely type-level fixes.

