
# Collapsed Sidebar Tooltips + Home Button

## 1. Add tooltips to collapsed sidebar items
The `SidebarMenuButton` already has a built-in `tooltip` prop that shows only when the sidebar is collapsed. Currently `AppMainNav.tsx` doesn't pass it.

**File: `src/components/layout/AppMainNav.tsx`** (line 153)
- Add `tooltip={item.label}` to each `SidebarMenuButton` in the nav items loop

## 2. Add a Home button
Add a Home icon button at the top of the sidebar (in `SidebarHeader`, before the title) that navigates to `/interactions/text/open`. When collapsed, it shows as just the icon with a tooltip; when expanded, it shows "Home" with the icon.

**File: `src/components/layout/AppMainNav.tsx`**
- Import `Home` from lucide-react
- Add a Home button in the `SidebarHeader` area, before "Customer Platform" title
- Links to `/interactions/text/open`
- Uses `SidebarMenuButton` with `tooltip="Home"` so it works when collapsed too

### Files to modify
- `src/components/layout/AppMainNav.tsx` — add tooltip prop + Home button
