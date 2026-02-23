

# Fix Filters UI + Uniform Toolbar Buttons

## Problems

1. **Filter popover looks bad** -- large Select dropdowns inside a popover feel heavy and clunky (as shown in screenshot)
2. **Toolbar buttons still have inconsistent sizing** -- text labels cause varying widths

## Solution

### 1. Replace Filter Popover with DropdownMenu

Replace the current Popover containing two large Select dropdowns with a clean **DropdownMenu** using radio groups for Status and Priority. This gives a native-feeling, compact filter experience.

```text
Filter Conversations
---
Status
  (*) All Status
  ( ) Open
  ( ) Pending
  ( ) Closed
---
Priority
  (*) All Priority
  ( ) Low
  ( ) Normal
  ( ) High
  ( ) Urgent
---
[Clear Filters]
```

**File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`**

- Replace the `<Popover>` wrapping filters (lines 118-158) with a `<DropdownMenu>` 
- Import `DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem` from `@/components/ui/dropdown-menu`
- Remove `Popover, PopoverContent, PopoverTrigger` imports
- Inline the status and priority radio groups directly -- no need for the separate `ConversationListFilters` component

### 2. Icon-Only Toolbar Buttons with Tooltips

Convert all 6 action buttons to uniform **h-7 w-7** icon-only squares with tooltips:

- Import `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from `@/components/ui/tooltip`
- Each button becomes:
  ```tsx
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon" className="h-7 w-7">
        <IconName className="!w-3.5 !h-3.5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom"><p>Label</p></TooltipContent>
  </Tooltip>
  ```
- Applies to: Select, +New (keeps `variant="default"`), Filters (uses DropdownMenuTrigger), Merge, Migrate, Mark all read
- Sort dropdown trigger also gets `h-7` to match

### 3. Wrap in TooltipProvider

Wrap the entire toolbar return in `<TooltipProvider delayDuration={300}>` so all tooltips work.

### Files Changed

| File | Change |
|---|---|
| `ConversationListHeader.tsx` | Replace Popover with DropdownMenu for filters; convert all buttons to icon-only h-7 w-7 with tooltips; wrap in TooltipProvider |
| `ConversationListFilters.tsx` | No changes needed (component becomes unused from header but kept for potential reuse elsewhere) |

### Visual Result

```text
[Select] [+New] [Filter v] [Merge] [Migrate] [Read]  Sort: Latest v
  28x28   28x28   28x28    28x28    28x28    28x28
  ghost  default  ghost    ghost    ghost    ghost
```

Filter dropdown opens as a clean DropdownMenu with radio groups instead of clunky Select dropdowns inside a popover.

