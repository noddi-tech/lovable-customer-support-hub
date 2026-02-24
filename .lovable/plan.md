

## Remove Top Header Bar — Move Features to Sidebar

The top header bar takes 56px of vertical space and duplicates functionality already in the sidebar. This plan removes it entirely and relocates its unique features into the sidebar.

### Current header features and where they go

| Feature | Currently in header | Destination |
|---|---|---|
| Logo + "Customer Support" | Left side | **Remove** (sidebar already has "Customer Platform" branding) |
| OrganizationSwitcher | Left side | **Sidebar header** (below the "Customer Platform" title) |
| Timezone display | Right side | **Sidebar footer** (small text above user profile) |
| ConnectionStatusIndicator | Right side | **Sidebar footer** (next to timezone) |
| Search button | Right side | **Remove** (search icon already in sidebar nav; Cmd+K shortcut stays) |
| NotificationDropdown | Right side | **Remove** (notifications link already in sidebar nav) |
| User avatar + dropdown menu | Right side | **Sidebar footer** (avatar with name + dropdown for settings/sign out) |
| Cmd+K keyboard shortcut | Header component | **Move to UnifiedAppLayout** (global handler, not tied to header) |

### Changes by file

**1. `src/components/layout/UnifiedAppLayout.tsx`**
- Remove `<AppHeader />` import and usage
- Change grid from `grid-rows-[56px_1fr]` to just `flex-1 min-h-0` (no header row)
- Add the Cmd+K keyboard shortcut handler + `SearchCommandPalette` here (global level)

**2. `src/components/layout/AppMainNav.tsx`**
- **Header section**: Add `<OrganizationSwitcher />` below the "Customer Platform" title
- **Footer section**: Replace the simple collapse button with a richer footer containing:
  - Connection status indicator + timezone (small row)
  - User avatar with name + dropdown menu (settings, design library, sign out)
  - Collapse/expand toggle button (kept at bottom)
- When sidebar is collapsed, footer shows just the avatar (clickable for dropdown) and a small status dot

**3. `src/components/dashboard/AppHeader.tsx`**
- No deletion needed immediately (keep file for potential future use), but it will no longer be imported anywhere

**4. `src/components/layout/__tests__/UnifiedAppLayout.test.tsx`**
- Remove assertions for header elements like "Customer Support Hub" and `getByRole('banner')`
- Update to reflect new layout without header row

### Sidebar footer design (expanded state)

```text
------------------------------
 Europe/Oslo . 14:32    [wifi]
------------------------------
 [avatar] John Doe        [v]
          john@email.com
------------------------------
 [<< Collapse]
------------------------------
```

### Sidebar footer design (collapsed state)

```text
--------
 [wifi]
--------
 [avatar]
--------
  [<<]
--------
```

### Technical notes

- The `SearchCommandPalette` dialog is a portal-based modal, so moving its state to `UnifiedAppLayout` keeps Cmd+K working globally without the header
- `OrganizationSwitcher` already handles its own visibility logic (hides when user has only one org)
- The layout gains 56px of vertical space for the conversation table
- Mobile: the sidebar trigger button needs to remain accessible -- we'll add a small floating trigger or use the existing `SidebarTrigger` from the sidebar component that's visible when collapsed

