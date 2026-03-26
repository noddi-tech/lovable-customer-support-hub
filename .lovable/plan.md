

## Fix: Sidebar Shows Only Icons on Mobile

### Root Cause

`AppMainNav` uses `isCollapsed = state === 'collapsed'` to hide text labels (`{!isCollapsed && <span>...</span>}`). On mobile, the sidebar renders inside a full-width Sheet, but the `state` value is still `"collapsed"` from the desktop sidebar context. This means every `{!isCollapsed && ...}` check evaluates to `false`, hiding all text labels, the OrganizationSwitcher, footer details, and nav item names.

### Fix

**File: `src/components/layout/AppMainNav.tsx`**

Change the collapsed check to account for mobile. On mobile, the Sheet is always full-width, so content should never be hidden:

```tsx
const { state, toggleSidebar, isMobile } = useSidebar();
const isCollapsed = state === 'collapsed' && !isMobile;
```

This single line change fixes all `{!isCollapsed && ...}` conditionals throughout the component — the title, OrganizationSwitcher, nav labels, footer timezone, user profile details, and collapse button will all render correctly on mobile.

### What Changes
| Element | Before (mobile) | After (mobile) |
|---------|-----------------|----------------|
| "Customer Platform" title | Hidden (`sr-only`) | Visible |
| OrganizationSwitcher | Hidden | Visible |
| Nav item labels | Hidden (icons only) | Visible with text |
| Group labels (Interactions, Marketing, etc.) | Hidden by CSS | Visible |
| Footer (timezone, user info) | Minimal | Full display |
| Collapse toggle button | Shows | Hidden (not needed on mobile) |

1 file, 1 line change. No new dependencies. Desktop behavior unchanged.

