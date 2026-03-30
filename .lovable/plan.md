

## Fix: Sidebar Auto-Collapse on All Nav Clicks (Desktop + Mobile)

### Root Cause
`handleNavClick` in `AppMainNav.tsx` only calls `setOpenMobile(false)` when `isMobile` is true. On desktop, nothing happens — the sidebar stays expanded after clicking a link.

### Fix

| File | Change |
|------|--------|
| `src/components/layout/AppMainNav.tsx` | Destructure `setOpen` from `useSidebar()`. Update `handleNavClick` to call `setOpen(false)` on desktop (collapses to icon mode) and `setOpenMobile(false)` on mobile (closes drawer). |

The sidebar already uses `collapsible="icon"`, so `setOpen(false)` will collapse it to the icon strip — not hide it entirely.

