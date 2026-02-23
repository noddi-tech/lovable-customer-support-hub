

# Ultra-Compact Toolbar: Uniform Button Heights

## Problem

From the screenshot, the buttons are still visually too tall and inconsistent. The `+New` button with its filled background appears larger than the ghost buttons. The Sort dropdown also appears taller than the action buttons. All elements need to be uniformly compact.

## Changes

### File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`

**Height reduction**: Change all buttons from `h-6` (24px) to `h-5` (20px) for a truly compact, Linear-style toolbar. This applies uniformly to:

- Select button (line 95)
- +New button (line 109)
- Filters button (line 124)
- Merge button (line 167)
- Migrate button (line 192)
- Mark all read button (line 217)
- Sort SelectTrigger (line 231)

**Icon size reduction**: Change all icons from `!w-3 !h-3` (12px) to `!w-3.5 !h-3.5` (14px) -- actually keep at `!w-3 !h-3` since h-5 is very compact.

**Uniform sizing**: Every interactive element in the toolbar will use exactly `h-5 px-1.5 text-xs` to ensure visual consistency regardless of variant (ghost, default, outline).

**Sort dropdown border removal**: Add `border-0` to the SelectTrigger so it matches the ghost button styling and doesn't appear heavier than other elements. Also add `shadow-none` to remove any box shadow.

**Container padding**: Reduce from `p-1.5 md:p-2` to `p-1 md:p-1.5` for tighter spacing.

### Summary of specific class changes

| Element | Before | After |
|---|---|---|
| Container | `p-1.5 md:p-2` | `p-1 md:p-1.5` |
| All buttons | `h-6 px-1.5` | `h-5 px-1.5` |
| Sort trigger | `h-6` | `h-5 border-0 shadow-none` |
| Unread badge | `h-4` | `h-3.5` |

This creates a toolbar where every element is exactly 20px tall, giving a clean, professional, uniform density.

