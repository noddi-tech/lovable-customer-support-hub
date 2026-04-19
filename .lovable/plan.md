

# Build native Recruitment module with tabbed sub-navigation

## Overview
Replace the iframe in `RecruitmentInterface.tsx` with a native tabbed layout. All recruitment sub-routes (`/operations/recruitment/*`) keep using `<Index />` as the page shell (consistent with how `tickets`, `doorman`, etc. work today), so the existing `OperationsSidebar` continues to work unchanged.

## Routes added in `src/App.tsx`
Under the existing `/operations/recruitment` block, add:
- `/operations/recruitment/pipeline` → `<Index />`
- `/operations/recruitment/applicants` → `<Index />`
- `/operations/recruitment/applicants/:id` → `<Index />`
- `/operations/recruitment/positions` → `<Index />`
- `/operations/recruitment/positions/:id` → `<Index />`
- `/operations/recruitment/import` → `<Index />`
- `/operations/recruitment/settings` → `<Index />`

The existing `/operations/recruitment` route stays as-is (default = Overview).

## `src/pages/Index.tsx` — sub-section detection
`getCurrentSubSection()` already returns `'recruitment'` for any path starting with `/operations/recruitment`. Keep that, and let `RecruitmentInterface` handle internal routing based on `useLocation()`.

## New folder: `src/components/dashboard/recruitment/`

**`RecruitmentInterface.tsx`** (replaces existing iframe file)
- Reads `useLocation()` and parses the path after `/operations/recruitment/`.
- If path matches `applicants/:id` or `positions/:id` → render the detail page **without** the tab bar.
- Otherwise → render:
  - A horizontal tab bar at the top (sticky, styled like other in-app nav tabs).
  - Below: the active sub-page based on the path segment (default = Overview).
- Tab bar uses Tailwind styling consistent with the app:
  - `border-b border-border` row, each tab as a `Link` with `px-4 py-2 text-sm font-medium`, active state `border-b-2 border-primary text-foreground`, inactive `text-muted-foreground hover:text-foreground`.
- Tab definitions (label, path):
  - `Oversikt` → `/operations/recruitment`
  - `Pipeline` → `/operations/recruitment/pipeline`
  - `Søkere` → `/operations/recruitment/applicants`
  - `Stillinger` → `/operations/recruitment/positions`
  - `Importer` → `/operations/recruitment/import`
  - `Innstillinger` → `/operations/recruitment/settings`
- Active detection: a tab is active when `location.pathname === tab.path` OR (for non-overview tabs) `location.pathname.startsWith(tab.path + '/')`. The Overview tab is active only on exact match (otherwise nested paths would activate it too).

**Placeholder pages** — each is a tiny component rendering a heading + "Denne siden er under utvikling" inside a centered card (matching `ServiceTicketsInterface` style):
- `RecruitmentOverview.tsx` — title "Oversikt"
- `RecruitmentPipeline.tsx` — title "Pipeline"
- `RecruitmentApplicants.tsx` — title "Søkere"
- `RecruitmentPositions.tsx` — title "Stillinger"
- `RecruitmentImport.tsx` — title "Importer"
- `RecruitmentSettings.tsx` — title "Innstillinger"
- `ApplicantProfile.tsx` — title "Søker", reads `:id` via `useParams`, includes a back button (`← Tilbake til søkere` → `/operations/recruitment/applicants`). No tab bar.
- `PositionDetail.tsx` — title "Stilling", reads `:id`, back button → `/operations/recruitment/positions`. No tab bar.

## Sub-section routing inside `RecruitmentInterface.tsx`
Simple switch based on the path segment after `recruitment/`:
```
'' or undefined → <RecruitmentOverview />
'pipeline'      → <RecruitmentPipeline />
'applicants'    → <RecruitmentApplicants /> (with tabs)
'applicants/:id'→ <ApplicantProfile />     (no tabs, returned early)
'positions'     → <RecruitmentPositions />
'positions/:id' → <PositionDetail />       (no tabs, returned early)
'import'        → <RecruitmentImport />
'settings'      → <RecruitmentSettings />
```

## Files
**Modified:**
- `src/App.tsx` — add 7 new child routes under `/operations/recruitment`
- `src/components/dashboard/RecruitmentInterface.tsx` — rewrite as tabbed layout dispatcher

**New (in `src/components/dashboard/recruitment/`):**
- `RecruitmentOverview.tsx`
- `RecruitmentPipeline.tsx`
- `RecruitmentApplicants.tsx`
- `RecruitmentPositions.tsx`
- `RecruitmentImport.tsx`
- `RecruitmentSettings.tsx`
- `ApplicantProfile.tsx`
- `PositionDetail.tsx`

**Untouched:** `nav-config.ts`, `OperationsSidebar.tsx`, `OpsWrapper.tsx`, `Index.tsx` (the existing `recruitment` sub-section already maps to `<RecruitmentInterface />`).

