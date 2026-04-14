

# Center Home Icon in Collapsed Sidebar

## Problem
The Home button is wrapped in an extra `<div className="flex items-center gap-2">` around the `SidebarMenu`, which other nav items don't have. This causes the Home icon to be offset/misaligned when the sidebar is collapsed.

## Fix
**File: `src/components/layout/AppMainNav.tsx`** (lines 112-123)

Remove the wrapping `<div>` so the Home `SidebarMenu` sits directly in the `SidebarHeader`, matching the same structure as the nav items in `SidebarContent`:

```tsx
{/* Before */}
<div className="flex items-center gap-2">
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip="Home">
        <NavLink ...>
          <Home />
          {!isCollapsed && <span>Home</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</div>

{/* After */}
<SidebarMenu>
  <SidebarMenuItem>
    <SidebarMenuButton asChild tooltip="Home">
      <NavLink ...>
        <Home />
        {!isCollapsed && <span>Home</span>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>
</SidebarMenu>
```

### Files to modify
- `src/components/layout/AppMainNav.tsx` — remove wrapping div around Home button

