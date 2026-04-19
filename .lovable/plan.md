
## Plan: Admin recruitment shell at `/admin/recruitment`

### 1. Sidebar — `src/components/admin/AdminPortalLayout.tsx`
- Import `Briefcase` from `lucide-react`.
- Add a new array `recruitmentItems = [{ title: 'Recruitment', url: '/admin/recruitment', icon: Briefcase }]`.
- Render a new `<SidebarGroup>` titled **"Recruitment"** placed AFTER the "AI & Intelligence" group and BEFORE the Super Admin block. Single item, no sub-items (matches `/admin/knowledge` pattern). Uses existing `isActive(url)` so the entry highlights on any `/admin/recruitment*` path.

### 2. Route — `src/App.tsx`
- Add: `<Route path="/admin/recruitment" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />` next to other `/admin/*` routes (line ~172). Goes through `Settings` dispatcher just like every other admin route — keeps `AdminRoute` redirect-to-`/settings/general` working for non-admins automatically.
- Remove: `<Route path="/operations/recruitment/settings" ... />` (line 141).

### 3. Dispatcher — `src/pages/Settings.tsx`
In `renderAdminContent()`, before the `return <AdminPortal />`, add:
```tsx
if (location.pathname.startsWith('/admin/recruitment')) {
  const RecruitmentAdmin = React.lazy(() => import('./admin/RecruitmentAdmin'));
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <RecruitmentAdmin />
    </React.Suspense>
  );
}
```
Mirrors the existing `AdminDesignComponents` lazy-load pattern.

### 4. Page — `src/pages/admin/RecruitmentAdmin.tsx` (new)
- Does **NOT** wrap itself in `<AdminPortalLayout>` — the dispatcher in `Settings.tsx` already wraps admin content in `AdminPortalLayout`. Wrapping again would double-nest the sidebar (this is the same reason `KnowledgeManagement` and `AdminPortal` don't self-wrap).
- Uses shadcn `Tabs` with `value`/`onValueChange` driven by `useSearchParams` — `?tab=` param syncs both ways, defaults to `pipeline`.
- Five `TabsTrigger` entries with icons: Pipeline (Workflow), E-postmaler (Mail), Automatisering (Zap), Integrasjoner (Link2), Revisjon (History).
- Header: heading "Rekruttering" + Norwegian description.
- Each `TabsContent` renders a small `<PlaceholderTab title description />` card with a "Kommer snart" badge — pure display, no data fetching.

### 5. Operations tab bar — `src/components/dashboard/RecruitmentInterface.tsx`
- Remove the `{ label: 'Innstillinger', path: \`${BASE}/settings\` }` entry from `TABS`.
- Remove the `case 'settings': return <RecruitmentSettings />;` branch and the `import RecruitmentSettings` line.
- Delete `src/components/dashboard/recruitment/RecruitmentSettings.tsx`.

### Verification
1. Admin clicks "Recruitment" in admin sidebar → `/admin/recruitment` loads with Pipeline tab active.
2. Clicking each tab updates `?tab=…` and swaps placeholder content.
3. Direct load `/admin/recruitment?tab=automation` → Automatisering pre-selected.
4. Sidebar entry stays highlighted on any `/admin/recruitment*`.
5. Non-admin visiting `/admin/recruitment` redirects to `/settings/general` via existing `AdminRoute`.
6. `/operations/recruitment` no longer shows "Innstillinger" tab; `/operations/recruitment/settings` no longer routes.

### Files touched
- `src/components/admin/AdminPortalLayout.tsx` (add group)
- `src/App.tsx` (add admin route, remove operations settings route)
- `src/pages/Settings.tsx` (dispatch new path)
- `src/pages/admin/RecruitmentAdmin.tsx` (new)
- `src/components/dashboard/RecruitmentInterface.tsx` (remove tab + case + import)
- `src/components/dashboard/recruitment/RecruitmentSettings.tsx` (delete)
