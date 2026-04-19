
# Plan: Drag-and-drop Pipeline kanban

Replace the `RecruitmentPipeline.tsx` placeholder at `/operations/recruitment/pipeline` with a 4-column kanban board powered by **`@dnd-kit/core`** (already installed — no new package needed; the user's spec mentioned `@hello-pangea/dnd` but `@dnd-kit` is the project's existing standard, so I'll use that).

## File structure

**New (`src/components/dashboard/recruitment/pipeline/`):**
- `usePipeline.ts` — query hooks
- `PipelineFilters.tsx` — top filter bar
- `PipelineBoard.tsx` — `DndContext` wrapper + 4 columns + drag overlay
- `PipelineColumn.tsx` — one droppable column with header + card list
- `PipelineCard.tsx` — one draggable applicant card
- `PipelineEmptyState.tsx` — global empty state

**Modified:**
- `src/components/dashboard/recruitment/RecruitmentPipeline.tsx` — full rewrite assembling the above

## Hooks (`usePipeline.ts`)

- `usePipelineApplications({ positionId, assignedTo })` — single query selecting `id, current_stage_id, score, assigned_to, applied_at, created_at, updated_at, applicant_id, position_id, applicants(id, first_name, last_name, email, phone, source), job_positions(id, title), profiles:assigned_to(id, full_name, avatar_url)`. Optional `.eq('position_id', ...)` and `.eq('assigned_to', ...)` filters. `placeholderData: keepPreviousData` for smooth filter swaps. Key `['pipeline-applications', org, positionId, assignedTo]`.
- `daysSince(iso)` helper exported alongside — pure function computing whole days from `updated_at` to now (used in card for "X d" + red-after-7).

Reuses (no new code): `useApplicantPipeline()` (stages), `useJobPositions()` (filter), `useTeamMembers()` (filter), `useUpdateApplicationStage()` (drag commit), and `MoveStageDialog` from the applicants folder.

Stage counts come from grouping the single fetched array client-side — no separate count query needed (the spec mentions it as an option; one query is simpler and avoids drift).

## `RecruitmentPipeline.tsx` layout

```
<div className="flex flex-col h-[calc(100vh-120px)] p-6 gap-4">
  <div className="flex items-center justify-between">
    <h2 className="text-2xl font-semibold">Pipeline</h2>
  </div>
  <PipelineFilters value={filters} onChange={setFilters} totalCount={apps.length} />
  <PipelineBoard applications={apps} pipeline={pipeline} />
</div>
```

State: `filters = { positionId: 'all', assignedTo: 'all' }`.

Loading → 4 skeleton column outlines.
Empty global → `<PipelineEmptyState>` (Briefcase icon, copy per spec, button → `/operations/recruitment/positions`).

## `PipelineFilters.tsx`
Flex row, `gap-3 items-center`:
- "Stilling" `<Select>` — Alle stillinger + open positions from `useJobPositions().filter(p => p.status === 'open')`
- "Tilordnet" `<Select>` — Alle + items from `useTeamMembers()`
- Right-aligned muted text: `{totalCount} søkere totalt`

## `PipelineBoard.tsx`
- Wraps content in `<DndContext sensors={[PointerSensor (activation distance 6)]} collisionDetection={closestCorners}>`.
- Groups `applications` by `current_stage_id` into a `Record<stageId, App[]>` via `useMemo`.
- Renders columns in `pipeline.stages` order (sorted by `order`).
- `<div className="flex gap-4 overflow-x-auto flex-1 min-h-0">` for horizontal scroll on narrow screens.
- `DragOverlay` shows the active `PipelineCard` while dragging.
- Local state: `activeCard: App | null` + `pendingMove: { app, fromStageId, toStageId, toStageName } | null`.

**Drag flow:**
1. `onDragStart` → set `activeCard`.
2. `onDragEnd` → resolve target column id (the `over` is either a column or a card whose stage we look up). If same stage → no-op. If different stage:
   - **Optimistic update**: stash the dragged app's original `current_stage_id` in a ref, update React Query cache via `queryClient.setQueryData(['pipeline-applications', ...], ...)` to move the card visually.
   - Set `pendingMove` → opens `<MoveStageDialog>`.
3. **MoveStageDialog success** (any of 4 buttons): the existing `useUpdateApplicationStage` mutation already invalidates `applicant`/`applicant-events`/`applicants`. We add `pipeline-applications` invalidation locally (extra `queryClient.invalidateQueries` after `mutateAsync` resolves OR via dialog close handler) — done by wrapping the dialog with an `onMoved` callback.
4. **Dialog dismissed without confirm** (Esc / overlay click): revert by setting cache back to original snapshot.

To support invalidation of the new query without modifying `useUpdateApplicationStage`, the board listens to mutation success via a wrapping handler and calls `queryClient.invalidateQueries({ queryKey: ['pipeline-applications'] })` on close.

## `PipelineColumn.tsx`
- `useDroppable({ id: stage.id })`.
- Header: top border `border-t-4` colored via inline `style={{ borderTopColor: stage.color }}`, stage name bold, `<Badge>` count.
- Body: `overflow-y-auto flex-1 space-y-2 p-2` containing cards.
- Empty: dashed-border placeholder "Ingen søkere".
- Width: `w-[280px] flex-shrink-0`.

## `PipelineCard.tsx`
- `useDraggable({ id: app.id, data: { app } })`.
- `onClick` → `navigate('/operations/recruitment/applicants/' + app.applicant_id)` (suppressed if drag occurred — `@dnd-kit` activation distance 6 already prevents click hijack).
- Layout (`Card` w/ `p-3 cursor-grab hover:shadow-md`):
  - `<div className="font-medium">{first_name} {last_name}</div>`
  - `<div className="text-sm text-muted-foreground truncate">{job_positions?.title}</div>`
  - Bottom row `flex items-center justify-between gap-2 mt-2`:
    - Left: tiny score chip — small colored dot + number (red <30 / amber 30–60 / green >60), or "—"
    - Days-in-stage: `<span className={cn('text-xs', days > 7 && 'text-destructive font-medium')}>{days} d</span>`
    - Assigned: small `<Avatar className="h-5 w-5">` with `avatar_url`/initials, or muted dot if unassigned
    - Source: 1-letter abbrev in a tiny rounded box (`M` Meta / `F` Finn / `N` Nettside / `R` Referanse / `M` Manuell / `C` CSV) with the source badge color tone

## `PipelineEmptyState.tsx`
Centered `Card` with `<Briefcase>` icon, copy per spec, `Button asChild` → `/operations/recruitment/positions`.

## Notes
- Using `@dnd-kit/core` (already installed) instead of `@hello-pangea/dnd` — no new dependency. API differs (no `Droppable`/`Draggable` JSX wrappers; uses `useDroppable`/`useDraggable` hooks) but achieves the exact same UX.
- Single-query design keeps counts in sync with cards automatically.
- Optimistic cache update + revert on dialog cancel keeps the board snappy.
- All UI strings Norwegian Bokmål. RLS handles org scoping.
- `MoveStageDialog` is reused as-is (no changes).
