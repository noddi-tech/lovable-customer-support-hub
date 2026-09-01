# Keep the sidebar open until you close it

Today, clicking any navigation item in the sidebar closes it on desktop. It should stay open, and whatever you last chose (open or closed) should be remembered the next time you open the app.

## Behaviour after the change

- Desktop: clicking a nav item navigates and leaves the sidebar exactly as it is.
- Desktop: the sidebar only opens/closes via the toggle button or Cmd/Ctrl + B.
- That open/closed choice is saved and restored on the next visit and after refresh.
- Mobile: unchanged — the drawer still closes after picking a nav item (it overlays the content).

## Technical details

1. `src/components/layout/AppMainNav.tsx` — `handleNavClick` drops the desktop `setOpen(false)` branch; it only calls `setOpenMobile(false)` when `isMobile`.
2. `src/components/layout/UnifiedAppLayout.tsx` — replace the hardcoded `defaultOpen={false}` with a controlled `open` / `onOpenChange` pair backed by a `localStorage` key (e.g. `support-hub:sidebar-open`), read lazily on first render with `false` as the fallback for first-time users. Existing `sidebar:state` cookie writing inside `SidebarProvider` stays as-is; no change to `src/components/ui/sidebar.tsx`.
3. Mobile drawer state stays uncontrolled and always starts closed.
