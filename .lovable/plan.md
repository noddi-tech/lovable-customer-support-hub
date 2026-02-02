
# Fix: Popover Content Hidden Behind Header

## Problem

The collapsed sidebar's availability popover has its "Chat" label cut off at the top because it's being clipped by the header. The popover uses `align="start"` which positions it at the top edge of the trigger button, causing the content to appear behind the header element.

## Solution

Add `alignOffset` prop to the `PopoverContent` component to push the popover down slightly, ensuring the "Chat" label is fully visible below the header.

## Implementation

### File: `src/components/layout/AgentAvailabilityPanel.tsx`

**Current code (line 139):**
```tsx
<PopoverContent side="right" align="start" className="w-56 p-3">
```

**Updated code:**
```tsx
<PopoverContent side="right" align="start" alignOffset={-8} sideOffset={8} className="w-56 p-3">
```

The `alignOffset` prop shifts the popover position along the alignment axis:
- A negative value moves it down (when align="start")
- Combined with slightly larger `sideOffset` for better visual spacing

Alternatively, we can change to `align="center"` which would center the popover relative to the trigger button, naturally avoiding the header overlap.

## Changes Summary

| File | Change |
|------|--------|
| `src/components/layout/AgentAvailabilityPanel.tsx` | Add `alignOffset` and/or adjust `sideOffset` to PopoverContent props |

## Expected Result

The popover will appear slightly lower, with the "Chat" label fully visible above the status buttons. The complete popover content including "Chat" section header, status buttons, "Phone" section, and login button will all be visible without being clipped by the page header.
